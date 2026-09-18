<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "GET">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfset documentId = trim(url.documentId ?: "")>
<cfset result = new idochive.DocumentService().exportOriginal(documentId)>
<cfif NOT result.ok>
    <cfset json.write({ "error" = result.error }, 404)>
</cfif>
<cfheader name="Content-Disposition" value="attachment; filename=""#result.filename#""">
<cfcontent type="#result.mimeType#" file="#result.tempPath#" deletefile="true">
