<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "GET">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfset pageNum = val(url.page ?: 1)>
<cfif pageNum LT 1>
    <cfset pageNum = 1>
</cfif>
<cfset result = new idochive.PreviewService().pageImage(url.documentId ?: "", pageNum)>
<cfif NOT result.ok>
    <cfset statusCode = structKeyExists(result, "notFound") AND result.notFound ? 404 : 400>
    <cfset json.write({ "error" = result.error }, statusCode)>
</cfif>
<cfheader name="Cache-Control" value="private, no-store">
<cfheader name="Content-Disposition" value="inline">
<cfcontent type="#result.mimeType#" file="#result.tempPath#" deletefile="true">
