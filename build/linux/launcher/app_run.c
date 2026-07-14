#define _GNU_SOURCE

#include "sandbox_classifier.h"

#include <errno.h>
#include <fcntl.h>
#include <limits.h>
#include <poll.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/stat.h>
#include <sys/socket.h>
#include <sys/types.h>
#include <sys/wait.h>
#include <time.h>
#include <unistd.h>

#define STDERR_LIMIT 65535
#define PREFERENCE_LIMIT 128
#define CONSENT_HANDOFF_EXIT_CODE 73
#define CONSENT_ACCEPTED_MESSAGE "CONSENT_ACCEPTED"
#define CONSENT_ACK_MESSAGE "CONSENT_ACK"

struct child_result {
  int exited;
  int exit_code;
  int signal_number;
  int ready_received;
  int consent_accepted;
  int consent_validated;
  int consent_ack_sent;
  long elapsed_ms;
  char stderr_text[STDERR_LIMIT + 1];
  size_t stderr_length;
};

static void forward_stderr(const char *buffer, size_t length) {
  size_t offset = 0;
  while (offset < length) {
    ssize_t written = write(STDERR_FILENO, buffer + offset, length - offset);
    if (written > 0) offset += (size_t)written;
    else if (written < 0 && errno == EINTR) continue;
    else break;
  }
}

static long monotonic_ms(void) {
  struct timespec value;
  if (clock_gettime(CLOCK_MONOTONIC, &value) != 0) return 0;
  return value.tv_sec * 1000L + value.tv_nsec / 1000000L;
}

static int has_consent(void) {
  const char *xdg = getenv("XDG_CONFIG_HOME");
  const char *home = getenv("HOME");
  char path[PATH_MAX];
  char content[PREFERENCE_LIMIT + 1];
  struct stat stat_value;
  ssize_t count;
  int descriptor;
  const char *expected = "{\"schemaVersion\":1,\"linuxAppImageUnsandboxedConsent\":true}\n";

  if (xdg != NULL && xdg[0] == '/') {
    if (snprintf(path, sizeof(path), "%s/NetraFlow/launcher-preferences.json", xdg) >= (int)sizeof(path)) return 0;
  } else {
    if (home == NULL || home[0] != '/') return 0;
    if (snprintf(path, sizeof(path), "%s/.config/NetraFlow/launcher-preferences.json", home) >= (int)sizeof(path)) return 0;
  }

  descriptor = open(path, O_RDONLY | O_CLOEXEC | O_NOFOLLOW);
  if (descriptor < 0) return 0;
  if (fstat(descriptor, &stat_value) != 0 || !S_ISREG(stat_value.st_mode) ||
      stat_value.st_uid != getuid() || (stat_value.st_mode & 077) != 0 ||
      stat_value.st_size <= 0 || stat_value.st_size > PREFERENCE_LIMIT) {
    close(descriptor);
    return 0;
  }
  count = read(descriptor, content, PREFERENCE_LIMIT);
  close(descriptor);
  if (count <= 0) return 0;
  content[count] = '\0';
  return strcmp(content, expected) == 0;
}

static int prepend_environment_path(const char *name, const char *prefix) {
  const char *current = getenv(name);
  size_t length = strlen(prefix) + (current && current[0] ? strlen(current) + 2 : 1);
  char *value = malloc(length);
  if (value == NULL) return 0;
  if (current && current[0]) snprintf(value, length, "%s:%s", prefix, current);
  else snprintf(value, length, "%s", prefix);
  if (setenv(name, value, 1) != 0) {
    free(value);
    return 0;
  }
  free(value);
  return 1;
}

static int configure_appimage_environment(const char *appdir) {
  char value[PATH_MAX];
  if (snprintf(value, sizeof(value), "%s/usr/lib", appdir) >= (int)sizeof(value) ||
      !prepend_environment_path("LD_LIBRARY_PATH", value)) return 0;
  if (snprintf(value, sizeof(value), "%s:%s/usr/sbin", appdir, appdir) >= (int)sizeof(value) ||
      !prepend_environment_path("PATH", value)) return 0;
  if (snprintf(value, sizeof(value), "%s/usr/share", appdir) >= (int)sizeof(value) ||
      !prepend_environment_path("XDG_DATA_DIRS", value)) return 0;
  if (snprintf(value, sizeof(value), "%s/usr/share/glib-2.0/schemas", appdir) >= (int)sizeof(value)) return 0;
  return setenv("GSETTINGS_SCHEMA_DIR", value, 1) == 0;
}

static int is_launcher_internal_argument(const char *argument) {
  return strncmp(argument, "--nf-launcher-ready-fd=", 23) == 0 ||
    strncmp(argument, "--nf-launcher-consent-fd=", 25) == 0 ||
    strncmp(argument, "--nf-launcher-state=", 20) == 0 ||
    strncmp(argument, "--nf-bootstrap-theme=", 21) == 0;
}

static char **make_child_argv(const char *binary, int argc, char **argv, int unsandboxed, int bootstrap) {
  char **child_argv = calloc((size_t)argc + 4, sizeof(char *));
  int index = 0;
  int source;
  if (child_argv == NULL) return NULL;
  child_argv[index++] = (char *)binary;
  if (unsandboxed) child_argv[index++] = "--no-sandbox";
  if (bootstrap) child_argv[index++] = "--nf-sandbox-consent-bootstrap";
  for (source = 1; source < argc; source++) {
    if (strcmp(argv[source], "--no-sandbox") == 0 ||
        strcmp(argv[source], "--nf-sandbox-consent-bootstrap") == 0 ||
        is_launcher_internal_argument(argv[source])) continue;
    child_argv[index++] = argv[source];
  }
  child_argv[index] = NULL;
  return child_argv;
}

static struct child_result run_child(const char *binary, char **child_argv, int authorized, int bootstrap) {
  int stderr_pipe[2];
  int ready_pipe[2];
  int consent_socket[2] = { -1, -1 };
  int status = 0;
  int child_finished = 0;
  pid_t child;
  long started = monotonic_ms();
  struct child_result result;
  memset(&result, 0, sizeof(result));

  if (pipe(stderr_pipe) != 0 || pipe(ready_pipe) != 0 ||
      (bootstrap && socketpair(AF_UNIX, SOCK_SEQPACKET, 0, consent_socket) != 0)) {
    result.exited = 1;
    result.exit_code = 127;
    return result;
  }
  child = fork();
  if (child == 0) {
    char descriptor_text[32];
    close(stderr_pipe[0]);
    close(ready_pipe[0]);
    if (bootstrap) close(consent_socket[0]);
    dup2(stderr_pipe[1], STDERR_FILENO);
    close(stderr_pipe[1]);
    snprintf(descriptor_text, sizeof(descriptor_text), "%d", ready_pipe[1]);
    setenv("NF_PACKAGE_KIND", "appimage", 1);
    setenv("NF_LAUNCHER_READY_FD", descriptor_text, 1);
    if (bootstrap) {
      snprintf(descriptor_text, sizeof(descriptor_text), "%d", consent_socket[1]);
      setenv("NF_LAUNCHER_CONSENT_FD", descriptor_text, 1);
    } else {
      unsetenv("NF_LAUNCHER_CONSENT_FD");
    }
    if (authorized) setenv("NF_UNSANDBOXED_AUTHORIZED", "1", 1);
    else unsetenv("NF_UNSANDBOXED_AUTHORIZED");
    execv(binary, child_argv);
    dprintf(STDERR_FILENO, "NetraFlow launcher: exec failed: %s\n", strerror(errno));
    _exit(127);
  }
  close(stderr_pipe[1]);
  close(ready_pipe[1]);
  if (bootstrap) close(consent_socket[1]);
  fcntl(stderr_pipe[0], F_SETFL, O_NONBLOCK);
  fcntl(ready_pipe[0], F_SETFL, O_NONBLOCK);
  if (bootstrap) fcntl(consent_socket[0], F_SETFL, O_NONBLOCK);

  while (!child_finished) {
    struct pollfd descriptors[3] = {
      { stderr_pipe[0], POLLIN | POLLHUP, 0 },
      { ready_pipe[0], POLLIN | POLLHUP, 0 },
      { bootstrap ? consent_socket[0] : -1, POLLIN | POLLHUP, 0 }
    };
    char buffer[4096];
    ssize_t count;
    poll(descriptors, 3, 100);
    while ((count = read(stderr_pipe[0], buffer, sizeof(buffer))) > 0) {
      size_t available = STDERR_LIMIT - result.stderr_length;
      size_t copied = (size_t)count < available ? (size_t)count : available;
      if (copied > 0) {
        memcpy(result.stderr_text + result.stderr_length, buffer, copied);
        result.stderr_length += copied;
      }
      forward_stderr(buffer, (size_t)count);
    }
    if (read(ready_pipe[0], buffer, sizeof(buffer)) > 0) result.ready_received = 1;
    if (bootstrap && !result.consent_accepted && (descriptors[2].revents & POLLIN)) {
      count = recv(consent_socket[0], buffer, sizeof(buffer), 0);
      if (count == (ssize_t)strlen(CONSENT_ACCEPTED_MESSAGE) &&
          memcmp(buffer, CONSENT_ACCEPTED_MESSAGE, strlen(CONSENT_ACCEPTED_MESSAGE)) == 0) {
        result.consent_accepted = 1;
        result.consent_validated = has_consent();
        if (result.consent_validated &&
            send(consent_socket[0], CONSENT_ACK_MESSAGE, strlen(CONSENT_ACK_MESSAGE), MSG_NOSIGNAL) ==
              (ssize_t)strlen(CONSENT_ACK_MESSAGE)) {
          result.consent_ack_sent = 1;
        }
        if (!result.consent_ack_sent) shutdown(consent_socket[0], SHUT_RDWR);
      } else {
        shutdown(consent_socket[0], SHUT_RDWR);
      }
    }
    if (waitpid(child, &status, WNOHANG) == child) child_finished = 1;
  }
  while (1) {
    char buffer[4096];
    ssize_t count = read(stderr_pipe[0], buffer, sizeof(buffer));
    if (count <= 0) break;
    if (result.stderr_length < STDERR_LIMIT) {
      size_t available = STDERR_LIMIT - result.stderr_length;
      size_t copied = (size_t)count < available ? (size_t)count : available;
      memcpy(result.stderr_text + result.stderr_length, buffer, copied);
      result.stderr_length += copied;
    }
    forward_stderr(buffer, (size_t)count);
  }
  close(stderr_pipe[0]);
  close(ready_pipe[0]);
  if (bootstrap) close(consent_socket[0]);
  result.stderr_text[result.stderr_length] = '\0';
  result.elapsed_ms = monotonic_ms() - started;
  if (WIFEXITED(status)) {
    result.exited = 1;
    result.exit_code = WEXITSTATUS(status);
  } else if (WIFSIGNALED(status)) {
    result.signal_number = WTERMSIG(status);
  }
  return result;
}

static int result_status(struct child_result result) {
  if (result.exited) return result.exit_code;
  if (result.signal_number) return 128 + result.signal_number;
  return 1;
}

int main(int argc, char **argv) {
  const char *appdir = getenv("APPDIR");
  char binary[PATH_MAX];
  char **child_argv;
  struct child_result result;
  int consent;

  if (appdir == NULL || appdir[0] != '/' ||
      snprintf(binary, sizeof(binary), "%s/netraflow", appdir) >= (int)sizeof(binary)) {
    fputs("NetraFlow launcher: APPDIR is unavailable.\n", stderr);
    return 127;
  }
  if (!configure_appimage_environment(appdir)) {
    fputs("NetraFlow launcher: failed to configure the AppImage environment.\n", stderr);
    return 127;
  }
  consent = has_consent();
  child_argv = make_child_argv(binary, argc, argv, consent, 0);
  if (child_argv == NULL) return 127;
  result = run_child(binary, child_argv, consent, 0);
  free(child_argv);

  if (!consent && nf_is_explicit_sandbox_failure(
      result.exited, result.exit_code, result.signal_number, result.ready_received,
      result.elapsed_ms, result.stderr_text, result.stderr_length)) {
    child_argv = make_child_argv(binary, argc, argv, 1, 1);
    if (child_argv == NULL) return 127;
    result = run_child(binary, child_argv, 0, 1);
    free(child_argv);
    if (result.exited && result.exit_code == CONSENT_HANDOFF_EXIT_CODE &&
        result.consent_accepted && result.consent_validated && result.consent_ack_sent) {
      child_argv = make_child_argv(binary, argc, argv, 1, 0);
      if (child_argv == NULL) return 127;
      result = run_child(binary, child_argv, 1, 0);
      free(child_argv);
    }
  }
  return result_status(result);
}
