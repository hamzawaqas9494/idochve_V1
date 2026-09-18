<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfset uploads = new idochive.UploadService()>
<cfif cgi.request_method EQ "GET">
    <cfset result = uploads.status(url.uploadId ?: "")>
    <cfif NOT result.ok>
        <cfset json.write({ "error" = result.error }, structKeyExists(result, "notFound") AND result.notFound ? 404 : 400)>
    </cfif>
    <cfset json.write(result.session)>
<cfelseif cgi.request_method EQ "POST">
    <cfset body = json.readBody()>
    <cfset result = uploads.start(body)>
    <cfif NOT result.ok>
        <cfset json.write({ "error" = result.error }, 400)>
    </cfif>
    <cfset json.write(result.session, 201)>
<cfelse>
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
