#include "sandbox_classifier.h"

#include <string.h>

static int contains(const char *text, const char *needle) {
  return text != NULL && needle != NULL && strstr(text, needle) != NULL;
}

int nf_is_explicit_sandbox_failure(
    int exited,
    int exit_code,
    int signal_number,
    int ready_received,
    long elapsed_ms,
    const char *stderr_text,
    size_t stderr_length) {
  int abnormal_exit;
  int suid_failure;
  int namespace_failure;

  (void)stderr_length;
  abnormal_exit = (exited && exit_code != 0) || signal_number != 0;
  if (!abnormal_exit || ready_received || elapsed_ms < 0 || elapsed_ms > 15000) {
    return 0;
  }

  suid_failure =
      contains(stderr_text, "The SUID sandbox helper binary was found, but is not configured correctly") ||
      (contains(stderr_text, "No usable sandbox!") &&
       (contains(stderr_text, "chrome-sandbox") ||
        contains(stderr_text, "namespace") ||
        contains(stderr_text, "setuid")));
  namespace_failure =
      (contains(stderr_text, "Failed to move to new namespace") ||
       contains(stderr_text, "Failed to create a new namespace") ||
       contains(stderr_text, "InitializeSandbox()") ||
       (contains(stderr_text, "sandbox_host_linux.cc") &&
        contains(stderr_text, "Check failed"))) &&
      (contains(stderr_text, "Operation not permitted") ||
       contains(stderr_text, "Permission denied") ||
       contains(stderr_text, "namespace sandbox"));

  return suid_failure || namespace_failure;
}
