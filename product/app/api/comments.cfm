<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfset workflow = new idochive.WorkflowService()>
<cfif cgi.request_method EQ "GET">
    <cfset documentId = url.documentId ?: "">
    <cfif NOT len(documentId)>
        <cfset json.write({ "error" = "documentId is required." }, 400)>
    </cfif>
    <cfset json.write({ "comments" = workflow.listComments(documentId) })>
<cfelseif cgi.request_method EQ "POST">
    <cfset body = json.readBody()>
    <cfset result = workflow.addComment(body.documentId ?: "", body.body ?: "")>
    <cfif result.ok>
        <cfset json.write({ "ok" = true })>
    <cfelse>
        <cfset json.write({ "error" = result.error }, 400)>
    </cfif>
<cfelseif listFindNoCase("PUT,PATCH,DELETE", cgi.request_method)>
    <cfset json.write({ "error" = "Comments are immutable. Update and delete are not allowed." }, 405)>
<cfelse>
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
