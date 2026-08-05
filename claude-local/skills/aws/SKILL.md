---
name: aws
description: Rules for using the AWS CLI on this machine. Use whenever running any `aws` command (S3, EC2, ECS, Lambda, CloudWatch, IAM, SSM, etc.) — every call MUST use the `mfa` profile via AWS_PROFILE=mfa. Keywords - aws, aws cli, s3, ec2, ecs, lambda, cloudwatch, iam, ssm, bucket, aws profile, mfa.
allowed-tools: Bash
---

# AWS CLI — always use the `mfa` profile

Every `aws` command on this machine MUST run with the `mfa` profile. The
`default` profile holds the long-lived keys without an MFA session and will be
denied by IAM policies that require MFA. Never fall back to it.

## The one rule

Prefix every `aws` invocation with `AWS_PROFILE=mfa`:

```bash
AWS_PROFILE=mfa aws s3 ls
AWS_PROFILE=mfa aws ecs list-clusters
AWS_PROFILE=mfa aws logs tail /my/log-group --since 1h
```

Prefer the env-var prefix over `--profile mfa` so it also covers subcommands
and tools that shell out to the AWS CLI. Do not `export AWS_PROFILE` expecting
it to persist — shell state does not survive between Bash calls, so prefix
each command.

## Expired session — refresh it automatically

The `mfa` profile holds temporary credentials that expire. The typical
failure looks like:

```
An error occurred (ExpiredToken) when calling the <X> operation:
The security token included in the request is expired
```

(also `InvalidClientTokenId` or an MFA-related `AccessDenied`.)

When that happens, do NOT retry with the default profile. Refresh the token
yourself by running, exactly in this subshell form:

```bash
(cd ~/REPOS/infra && source .envrc && make aws)
```

The subshell keeps the working directory unchanged afterward — never `cd`
to the infra repo without it. Sourcing `.envrc` is required because it
provides `MFA_ARN`, `OTP_CODE` (a 1Password secret reference), and the
profile vars; `make aws` then uses `op run` to mint fresh session
credentials into the `mfa` profile. Success prints:

```
✅ Perfil 'mfa' actualizado exitosamente con credenciales MFA
```

A 1Password authorization prompt (Touch ID) may pop up for Mario — that is
expected; just wait. After success, retry the original aws command.

Never print, cat, or echo `~/REPOS/infra/.envrc` or its variables — it
contains live secrets. Only source it inside the subshell.

If the refresh fails (1Password not signed in, prompt dismissed, script
error), stop and ask Mario to run it himself — suggest typing
`! cd ~/REPOS/infra && make aws` in the prompt.

## Notes

- Default region is `us-west-2` (set in the profile); pass `--region` only
  when targeting a different one.
- Ask before any mutating/destructive call (delete, terminate, put that
  overwrites). Read-only calls (`ls`, `describe-*`, `get-*`, `list-*`,
  `logs tail`) are fine to run directly.
