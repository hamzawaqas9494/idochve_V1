<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "POST">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfset body = json.readBody()>
<cfset result = new idochive.UploadService().complete(body.uploadId ?: "")>
<cfif NOT result.ok>
    <cfset json.write({ "error" = result.error }, structKeyExists(result, "notFound") AND result.notFound ? 404 : 400)>
</cfif>
<cfset json.write({
    "contractVersion" = "1",
    "id" = result.id,
    "state" = result.state,
    "uploadId" = result.uploadId
})>
