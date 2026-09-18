<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfset review = new idochive.ReviewService()>
<cfif cgi.request_method EQ "GET">
    <cfset json.write({ "items" = review.listClassifications() })>
<cfelseif cgi.request_method EQ "POST">
    <cfset body = json.readBody()>
    <cfset result = review.decideClassification(body.id ?: "", body.state ?: "")>
    <cfif result.ok>
        <cfset json.write(result)>
    <cfelse>
        <cfset json.write({ "error" = result.error }, result.error EQ "Access denied." ? 403 : 400)>
    </cfif>
<cfelse>
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
