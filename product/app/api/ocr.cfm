<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfset ocr = new idochive.OcrService()>
<cfif NOT ocr.canReview()>
    <cfset json.write({ "error" = "Access denied." }, 403)>
</cfif>
<cfif cgi.request_method EQ "GET">
    <cfset json.write({ "items" = ocr.listNeedsValidation() })>
<cfelseif cgi.request_method EQ "POST">
    <cfset body = json.readBody()>
    <cfset result = ocr.correct(body.id ?: "", body.correctedText ?: "")>
    <cfif result.ok>
        <cfset json.write({ "ok" = true })>
    <cfelse>
        <cfset json.write({ "error" = result.error }, 400)>
    </cfif>
<cfelse>
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
