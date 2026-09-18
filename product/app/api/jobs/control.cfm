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
<cfset result = new idochive.JobControlService().apply(body.documentId ?: "", body.action ?: "")>
<cfif result.ok>
    <cfset json.write(result)>
<cfelseif structKeyExists(result, "notFound") AND result.notFound>
    <cfset json.write({ "error" = result.error }, 404)>
<cfelse>
    <cfset json.write({ "error" = result.error }, 400)>
</cfif>
