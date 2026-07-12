#ifndef NF_SANDBOX_CLASSIFIER_H
#define NF_SANDBOX_CLASSIFIER_H

#include <stddef.h>

int nf_is_explicit_sandbox_failure(
    int exited,
    int exit_code,
    int signal_number,
    int ready_received,
    long elapsed_ms,
    const char *stderr_text,
    size_t stderr_length);

#endif
