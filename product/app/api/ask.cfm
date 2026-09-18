<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfset asks = new idochive.AskService()>
<cfif cgi.request_method EQ "GET">
    <cfset json.write({ "items" = asks.listRecent() })>
<cfelseif cgi.request_method EQ "POST">
    <cfset body = json.readBody()>
    <cfif len(trim(body.id ?: ""))>
        <cfset result = asks.decide(body.id, body.state ?: "")>
        <cfif result.ok>
            <cfset json.write(result)>
        <cfelse>
            <cfset json.write({ "error" = result.error }, result.error EQ "Access denied." ? 403 : 400)>
        </cfif>
    </cfif>
    <cfset result = asks.ask(body.question ?: "")>
    <cfif result.ok>
        <cfset json.write(result)>
    <cfelse>
        <cfset json.write(result, 200)>
    </cfif>
<cfelse>
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
