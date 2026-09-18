<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif NOT (auth.hasRole("auditor") OR auth.hasRole("records_officer") OR auth.hasRole("security_admin") OR auth.hasRole("platform_operator") OR auth.hasRole("approver"))>
    <cfset json.write({ "error" = "Access denied." }, 403)>
</cfif>
<cfif cgi.request_method NEQ "GET">
    <cfset json.write({ "error" = "Method not allowed. Restore is an operator script, not an HTTP action." }, 400)>
</cfif>
<cfset json.write(new idochive.BackupService().list())>
