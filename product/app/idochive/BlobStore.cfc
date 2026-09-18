component {

    public struct function writeEncrypted(
        required string documentId,
        required any fileUpload,
        string mimeType = "application/octet-stream",
        numeric versionNumber = 1
    ) {
        var dir = blobDir();
        if (!directoryExists(dir)) {
            directoryCreate(dir, true);
        }
        var key = arguments.documentId & "-v" & arguments.versionNumber & ".bin";
        var dest = dir & "/" & key;
        var bytes = fileReadBinary(arguments.fileUpload);
        fileWrite(dest, encryptGcm(bytes));
        return {
            blobKey: key,
            checksum: lCase(hash(bytes, "SHA-256")),
            byteSize: arrayLen(bytes),
            mimeType: len(arguments.mimeType) ? arguments.mimeType : "application/octet-stream"
        };
    }

    public string function decryptToTemp(required string blobKey, required string mimeType) {
        var blobPath = blobDir() & "/" & arguments.blobKey;
        if (!fileExists(blobPath)) {
            throw(type="Ingest.BlobMissing", message="Encrypted original is missing on disk.");
        }
        var packed = fileReadBinary(blobPath);
        var plain = isGcmPacked(packed) ? decryptGcm(packed) : decryptEcb(packed);
        var tempPath = getTempDirectory() & "idochive-src-" & createUUID() & "." & extensionFromMime(arguments.mimeType);
        fileWrite(tempPath, plain);
        return tempPath;
    }

    public void function deleteTemp(required string path) {
        if (len(arguments.path) && fileExists(arguments.path)) {
            try {
                fileDelete(arguments.path);
            } catch (any ignore) {
            }
        }
    }

    private string function blobDir() {
        return getDirectoryFromPath(expandPath("/Application.cfc")) & "storage/blobs";
    }

    private binary function aesKey() {
        var digest = createObject("java", "java.security.MessageDigest").getInstance("SHA-256");
        return digest.digest(createObject("java", "java.lang.String").init(passphrase()).getBytes("UTF-8"));
    }

    private binary function encryptGcm(required binary plain) {
        var ivSource = createObject("java", "java.lang.String").init(repeatString(chr(1), 12)).getBytes("US-ASCII");
        var iv = createObject("java", "java.util.Arrays").copyOf(ivSource, javacast("int", 12));
        createObject("java", "java.security.SecureRandom").nextBytes(iv);
        var spec = createObject("java", "javax.crypto.spec.GCMParameterSpec").init(javacast("int", 128), iv);
        var keySpec = createObject("java", "javax.crypto.spec.SecretKeySpec").init(aesKey(), "AES");
        var cipher = createObject("java", "javax.crypto.Cipher").getInstance("AES/GCM/NoPadding");
        cipher.init(cipher.ENCRYPT_MODE, keySpec, spec);
        var body = cipher.doFinal(arguments.plain);
        var out = createObject("java", "java.io.ByteArrayOutputStream");
        out.write(createObject("java", "java.lang.String").init("IDG1").getBytes("US-ASCII"));
        out.write(iv);
        out.write(body);
        return out.toByteArray();
    }

    private boolean function isGcmPacked(required binary packed) {
        if (arrayLen(arguments.packed) LT 32) {
            return false;
        }
        var magic = createObject("java", "java.lang.String").init("IDG1").getBytes("US-ASCII");
        var prefix = createObject("java", "java.util.Arrays").copyOfRange(arguments.packed, javacast("int", 0), javacast("int", 4));
        return createObject("java", "java.util.Arrays").equals(prefix, magic);
    }

    private binary function decryptGcm(required binary packed) {
        var iv = createObject("java", "java.util.Arrays").copyOfRange(arguments.packed, javacast("int", 4), javacast("int", 16));
        var body = createObject("java", "java.util.Arrays").copyOfRange(
            arguments.packed,
            javacast("int", 16),
            javacast("int", arrayLen(arguments.packed))
        );
        var spec = createObject("java", "javax.crypto.spec.GCMParameterSpec").init(javacast("int", 128), iv);
        var keySpec = createObject("java", "javax.crypto.spec.SecretKeySpec").init(aesKey(), "AES");
        var cipher = createObject("java", "javax.crypto.Cipher").getInstance("AES/GCM/NoPadding");
        cipher.init(cipher.DECRYPT_MODE, keySpec, spec);
        return cipher.doFinal(body);
    }

    private binary function decryptEcb(required binary packed) {
        var key16 = createObject("java", "java.util.Arrays").copyOf(aesKey(), javacast("int", 16));
        var keySpec = createObject("java", "javax.crypto.spec.SecretKeySpec").init(key16, "AES");
        var cipher = createObject("java", "javax.crypto.Cipher").getInstance("AES/ECB/PKCS5Padding");
        cipher.init(cipher.DECRYPT_MODE, keySpec);
        return cipher.doFinal(arguments.packed);
    }

    private string function passphrase() {
        var fromEnv = "";
        var path = expandPath("./.env");
        if (fileExists(path)) {
            var lines = listToArray(fileRead(path), chr(10));
            for (var line in lines) {
                line = trim(replace(line, chr(13), "", "all"));
                var eq = find("=", line);
                if (eq GT 1 && trim(left(line, eq - 1)) == "IDOCHIVE_BLOB_KEY") {
                    fromEnv = trim(mid(line, eq + 1, len(line)));
                }
            }
        }
        if (!len(fromEnv) && structKeyExists(server.system.environment, "IDOCHIVE_BLOB_KEY")) {
            fromEnv = toString(server.system.environment.IDOCHIVE_BLOB_KEY);
        }
        return len(fromEnv) ? fromEnv : "dev-only-blob-key-change";
    }

    public string function extensionFromMime(required string mimeType) {
        switch (lCase(listFirst(arguments.mimeType, ";"))) {
            case "image/png":
                return "png";
            case "image/jpeg":
            case "image/jpg":
                return "jpg";
            case "image/tiff":
            case "image/tif":
                return "tif";
            case "image/webp":
                return "webp";
            case "image/gif":
                return "gif";
            case "image/bmp":
                return "bmp";
            case "application/pdf":
                return "pdf";
            default:
                return "bin";
        }
    }
}
