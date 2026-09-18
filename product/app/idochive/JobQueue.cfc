component {

    public boolean function available() {
        return new idochive.RedisClient().available();
    }

    public struct function status() {
        var redis = new idochive.RedisClient();
        var up = redis.available();
        var depth = 0;
        if (up) {
            depth = redis.llen(mainKey()) + redis.llen(nextKey());
        }
        return {
            "engine": "redis",
            "available": up,
            "depth": depth
        };
    }

    public void function enqueue(
        required string kind,
        required string documentId,
        required string versionId,
        required string jobId,
        boolean priority = false
    ) {
        if (!available()) {
            return;
        }
        var redis = new idochive.RedisClient();
        removeForDocument(arguments.documentId);
        var payload = '{"kind":"#arguments.kind#","documentId":"#arguments.documentId#","versionId":"#arguments.versionId#","jobId":"#arguments.jobId#"}';
        redis.lpush(arguments.priority ? nextKey() : mainKey(), payload);
    }

    public struct function dequeue() {
        if (!available()) {
            return { ok: false };
        }
        var redis = new idochive.RedisClient();
        var raw = redis.rpop(nextKey());
        if (!len(raw)) {
            raw = redis.rpop(mainKey());
        }
        if (!len(raw)) {
            return { ok: false };
        }
        var payload = deserializeJSON(raw);
        payload.ok = true;
        payload.raw = raw;
        return payload;
    }

    public void function removeForDocument(required string documentId) {
        if (!available()) {
            return;
        }
        var redis = new idochive.RedisClient();
        dropMatching(redis, mainKey(), arguments.documentId);
        dropMatching(redis, nextKey(), arguments.documentId);
    }

    private void function dropMatching(required any redis, required string key, required string documentId) {
        var items = arguments.redis.lrange(arguments.key);
        for (var item in items) {
            if (find(arguments.documentId, toString(item))) {
                arguments.redis.lrem(arguments.key, toString(item));
            }
        }
    }

    private string function mainKey() {
        return "idochive:jobs";
    }

    private string function nextKey() {
        return "idochive:jobs:next";
    }
}
