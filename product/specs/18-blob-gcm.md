# Unit 18 spec: AES-GCM originals

## Goal

New encrypted originals use AES-GCM. Existing AES-ECB files remain readable. Local disk path is unchanged. No object-storage migration in this unit.

## Format

New files under `product/app/storage/blobs` begin with ASCII `IDG1`, then a 12-byte IV, then GCM ciphertext including the 16-byte tag.

The data key is SHA-256 of `IDOCHIVE_BLOB_KEY` (32 bytes, AES-256-GCM). Legacy ECB decrypt still uses the first 16 bytes of that digest, matching the previous writer.

## Decrypt

If the packed file has the `IDG1` prefix, decrypt GCM only. Otherwise decrypt AES-ECB/PKCS5. Do not fall through from a failed GCM auth tag to ECB.

## Out of scope

MinIO/S3, key rotation UI, HSM, re-encrypting the whole archive in place.
