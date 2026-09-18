<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "GET">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfset semantic = false>
<cfif len(url.semantic ?: "") AND listFindNoCase("1,true,yes", url.semantic)>
    <cfset semantic = true>
</cfif>
<cfset json.write(new idochive.SearchService().run(url.q ?: "", url.classCode ?: "", url.languageCode ?: "", semantic))>
