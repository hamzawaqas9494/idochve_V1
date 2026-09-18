<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfset workflow = new idochive.WorkflowService()>
<cfif cgi.request_method EQ "GET">
    <cfset json.write({ "tasks" = workflow.listOpen() })>
<cfelseif cgi.request_method EQ "POST">
    <cfif NOT workflow.canDecide()>
        <cfset json.write({ "error" = "Access denied." }, 403)>
    </cfif>
    <cfset body = json.readBody()>
    <cfset result = workflow.decide(body.id ?: "", body.state ?: "", body.comment ?: "")>
    <cfif result.ok>
        <cfset json.write(result)>
    <cfelse>
        <cfset json.write({ "error" = result.error }, 400)>
    </cfif>
<cfelse>
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
