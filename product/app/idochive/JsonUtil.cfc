component {

    public void function write(required any data, numeric statusCode = 200) {
        cfheader(statuscode=arguments.statusCode, statustext=statusText(arguments.statusCode));
        cfcontent(type="application/json; charset=utf-8", reset=true);
        writeOutput(serializeJSON(arguments.data));
        abort;
    }

    public struct function readBody() {
        var raw = toString(getHttpRequestData().content);
        if (!len(trim(raw))) {
            return {};
        }
        return deserializeJSON(raw);
    }

    private string function statusText(required numeric code) {
        switch (arguments.code) {
            case 200: return "OK";
            case 201: return "Created";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            default: return "Error";
        }
    }
}
