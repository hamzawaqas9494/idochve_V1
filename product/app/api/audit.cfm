<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required." }, 401)>
</cfif>
<cfif NOT (auth.hasRole("auditor") OR auth.hasRole("records_officer") OR auth.hasRole("security_admin") OR auth.hasRole("approver"))>
    <cfset json.write({ "error" = "Access denied." }, 403)>
</cfif>
<cfset json.write({ "events" = new idochive.AuditService().listForUser() })>
