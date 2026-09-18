component {

    public struct function processAvailable() {
        try {
            var queue = new idochive.JobQueue();
            if (queue.available()) {
                var payload = queue.dequeue();
                if (structKeyExists(payload, "ok") && payload.ok && (payload.kind ?: "") == "ocr") {
                    return new idochive.OcrWorker().processDocument(payload.documentId);
                }
            }
        } catch (any err) {
            // Fall through to PostgreSQL claim.
        }
        var result = new idochive.OcrWorker().processNext();
        if (structKeyExists(result, "processed") && result.processed) {
            return result;
        }
        result = new idochive.EmbedWorker().processNext();
        if (structKeyExists(result, "processed") && result.processed) {
            return result;
        }
        result = new idochive.ClassifyWorker().processNext();
        if (structKeyExists(result, "processed") && result.processed) {
            return result;
        }
        return new idochive.ExtractWorker().processNext();
    }
}
