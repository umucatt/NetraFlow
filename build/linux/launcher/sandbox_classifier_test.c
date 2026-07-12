#include "sandbox_classifier.h"

#include <assert.h>
#include <string.h>

int main(void) {
  const char *suid = "FATAL: The SUID sandbox helper binary was found, but is not configured correctly";
  const char *namespace_error = "Failed to move to new namespace: Operation not permitted";
  const char *gpu = "sandbox: GPU process warning";
  const char *sandbox_host = "FATAL:content/browser/sandbox_host_linux.cc:41 Check failed: shutdown: Operation not permitted (1)";
  assert(nf_is_explicit_sandbox_failure(1, 1, 0, 0, 50, suid, strlen(suid)) == 1);
  assert(nf_is_explicit_sandbox_failure(0, 0, 6, 0, 50, namespace_error, strlen(namespace_error)) == 1);
  assert(nf_is_explicit_sandbox_failure(0, 0, 6, 0, 50, sandbox_host, strlen(sandbox_host)) == 1);
  assert(nf_is_explicit_sandbox_failure(1, 1, 0, 1, 50, suid, strlen(suid)) == 0);
  assert(nf_is_explicit_sandbox_failure(1, 1, 0, 0, 50, gpu, strlen(gpu)) == 0);
  assert(nf_is_explicit_sandbox_failure(1, 1, 0, 0, 50, "missing asar", 12) == 0);
  assert(nf_is_explicit_sandbox_failure(1, 0, 0, 0, 50, suid, strlen(suid)) == 0);
  return 0;
}
