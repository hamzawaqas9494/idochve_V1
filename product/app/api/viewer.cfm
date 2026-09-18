<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "GET">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfset result = new idochive.PreviewService().meta(url.documentId ?: "")>
<cfif NOT result.ok>
    <cfset statusCode = structKeyExists(result, "notFound") AND result.notFound ? 404 : 400>
    <cfset json.write({ "error" = result.error }, statusCode)>
</cfif>
<cfset json.write({
    "contractVersion" = "1",
    "id" = result.id,
    "title" = result.title,
    "mimeType" = result.mimeType,
    "workflowState" = result.workflowState,
    "locked" = result.locked,
    "currentVersion" = result.currentVersion,
    "totalPages" = result.totalPages,
    "citations" = result.citations
})>
