component {

    public boolean function available() {
        try {
            var socket = open(400);
            socket.close();
            return true;
        } catch (any err) {
            return false;
        }
    }

    public numeric function llen(required string key) {
        return val(command([ "LLEN", arguments.key ]));
    }

    public numeric function lpush(required string key, required string value) {
        return val(command([ "LPUSH", arguments.key, arguments.value ]));
    }

    public string function rpop(required string key) {
        var reply = command([ "RPOP", arguments.key ]);
        return isNull(reply) ? "" : toString(reply);
    }

    public array function lrange(required string key) {
        var reply = command([ "LRANGE", arguments.key, "0", "-1" ]);
        return isArray(reply) ? reply : [];
    }

    public void function del(required string key) {
        command([ "DEL", arguments.key ]);
    }

    public void function lrem(required string key, required string value) {
        command([ "LREM", arguments.key, "0", arguments.value ]);
    }

    private any function command(required array parts) {
        var socket = open(2000);
        try {
            var out = socket.getOutputStream();
            out.write(charsetDecode(encode(arguments.parts), "utf-8"));
            out.flush();
            return readReply(socket.getInputStream());
        } finally {
            socket.close();
        }
    }

    private any function open(required numeric timeoutMs) {
        var host = appEnv("IDOCHIVE_REDIS_HOST", "127.0.0.1");
        var port = val(appEnv("IDOCHIVE_REDIS_PORT", "6379"));
        var socket = createObject("java", "java.net.Socket");
        socket.connect(createObject("java", "java.net.InetSocketAddress").init(host, javacast("int", port)), arguments.timeoutMs);
        socket.setSoTimeout(arguments.timeoutMs);
        var password = appEnv("IDOCHIVE_REDIS_PASSWORD", "");
        if (len(password)) {
            var out = socket.getOutputStream();
            out.write(charsetDecode(encode([ "AUTH", password ]), "utf-8"));
            out.flush();
            readReply(socket.getInputStream());
        }
        return socket;
    }

    private string function encode(required array parts) {
        var crlf = chr(13) & chr(10);
        var body = "*" & arrayLen(arguments.parts) & crlf;
        for (var part in arguments.parts) {
            var bytes = charsetDecode(toString(part), "utf-8");
            body &= "$" & arrayLen(bytes) & crlf & toString(part) & crlf;
        }
        return body;
    }

    private any function readReply(required any input) {
        var first = readLine(arguments.input);
        if (!len(first)) {
            return "";
        }
        var type = left(first, 1);
        var rest = mid(first, 2, len(first));
        switch (type) {
            case "+":
                return rest;
            case "-":
                throw(type="Redis.Error", message=rest);
            case ":":
                return val(rest);
            case "$":
                if (val(rest) < 0) {
                    return javacast("null", "");
                }
                return readBulk(arguments.input, val(rest));
            case "*":
                var items = [];
                var count = val(rest);
                for (var i = 1; i <= count; i++) {
                    arrayAppend(items, toString(readReply(arguments.input) ?: ""));
                }
                return items;
            default:
                return rest;
        }
    }

    private string function readBulk(required any input, required numeric size) {
        var buffer = createObject("java", "java.io.ByteArrayOutputStream").init();
        var remaining = arguments.size;
        var chunk = javacast("byte[]", repeatString(" ", 512).getBytes());
        while (remaining GT 0) {
            var read = arguments.input.read(chunk, 0, min(512, remaining));
            if (read < 0) {
                break;
            }
            buffer.write(chunk, 0, read);
            remaining -= read;
        }
        arguments.input.read();
        arguments.input.read();
        return charsetEncode(buffer.toByteArray(), "utf-8");
    }

    private string function readLine(required any input) {
        var buffer = createObject("java", "java.lang.StringBuilder").init();
        while (true) {
            var next = arguments.input.read();
            if (next < 0) {
                break;
            }
            if (next == 13) {
                arguments.input.read();
                break;
            }
            buffer.append(chr(next));
        }
        return buffer.toString();
    }

    private string function appEnv(required string key, required string fallback) {
        var path = expandPath("./.env");
        if (fileExists(path)) {
            var lines = listToArray(fileRead(path), chr(10));
            for (var line in lines) {
                line = trim(replace(line, chr(13), "", "all"));
                if (left(line, len(arguments.key) + 1) == arguments.key & "=") {
                    return trim(mid(line, len(arguments.key) + 2, len(line)));
                }
            }
        }
        if (structKeyExists(server.system.environment, arguments.key) && len(server.system.environment[arguments.key])) {
            return server.system.environment[arguments.key];
        }
        return arguments.fallback;
    }
}
