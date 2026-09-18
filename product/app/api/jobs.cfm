<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "GET">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfset json.write(new idochive.JobService().listForUser(url.filter ?: "all"))>
