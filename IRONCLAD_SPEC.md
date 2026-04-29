# Ironclad Integrity Standard (v1.0)

## Overview
The Ironclad Integrity Standard defines a protocol for cryptographic asset sealing using Hardware Security Modules (HSM) and Role-Based Access Control (RBAC). It is designed for high-stakes DevOps environments where asset sovereignty and anti-tamper evidence are paramount.

## The Three Pillars
1. **Immutable Fingerprinting (SHA-256)**: Every asset must be hashed using SHA-256 before transmission.
2. **Hardware-Backed Authority (RS256-HSM)**: Signatures must be generated within a FIPS 140-2 Level 3 Hardware Security Module. The private key never leaves the secure enclave.
3. **RBAC Governance**: Access to the signing enclave is restricted to identities governed by Azure RBAC, eliminating the need for long-lived static keys.

## Protocol Handshake
1. **Client**: Generates SHA-256 hash of `Asset[A]`.
2. **Orchestrator**: Authenticates via Managed Identity.
3. **HSM**: Signs hash using `RSA-HSM-2048`.
4. **Receipt**: A verifiable JSON receipt is generated containing:
   - `assetHash`: The original fingerprint.
   - `signature`: The HSM-generated proof.
   - `vaultUri`: The authoritative source of truth.
   - `timestamp`: UTC ISO-8601.

## Compliance
- **Cryptographic Engine**: Azure Key Vault (Premium)
- **Key Type**: RSA-HSM 2048-bit
- **Security Standard**: FIPS 140-2 Level 3
