<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif cgi.request_method EQ "POST">
    <cfset body = json.readBody()>
    <cfset result = auth.login(body.email ?: "", body.password ?: "")>
    <cfif result.ok>
        <cfset json.write({ "user" = result.user })>
    <cfelse>
        <cfset json.write({ "error" = "Access denied." }, 401)>
    </cfif>
<cfelseif cgi.request_method EQ "DELETE">
    <cfset auth.logout()>
    <cfset json.write({ "ok" = true })>
<cfelse>
    <cfif NOT auth.isAuthenticated()>
        <cfset json.write({ "error" = "Authentication required." }, 401)>
    </cfif>
    <cfset json.write({ "user" = auth.currentUser() })>
</cfif>
