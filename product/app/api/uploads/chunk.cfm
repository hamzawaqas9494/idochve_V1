<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "POST">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfif NOT structKeyExists(form, "index")>
    <cfset json.write({ "error" = "A chunk index is required." }, 400)>
</cfif>
<cfset uploadId = trim(form.uploadId ?: "")>
<cfset idx = val(form.index)>
<cfif NOT structKeyExists(form, "chunk") AND NOT structKeyExists(form, "file")>
    <cfset json.write({ "error" = "A chunk file is required." }, 400)>
</cfif>
<cfset field = structKeyExists(form, "chunk") ? "chunk" : "file">
<cffile action="upload" filefield="#field#" destination="#getTempDirectory()#" nameconflict="makeunique" result="uploaded">
<cfset storedPath = uploaded.serverDirectory & "/" & uploaded.serverFile>
<cfset result = new idochive.UploadService().writeChunk(uploadId, idx, storedPath)>
<cftry>
    <cffile action="delete" file="#storedPath#">
    <cfcatch></cfcatch>
</cftry>
<cfif NOT result.ok>
    <cfset json.write({ "error" = result.error }, structKeyExists(result, "notFound") AND result.notFound ? 404 : 400)>
</cfif>
<cfset json.write(result.session)>
