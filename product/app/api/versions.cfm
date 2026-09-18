<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "POST">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfif NOT (auth.hasRole("records_officer") OR auth.hasRole("document_controller") OR auth.hasRole("approver"))>
    <cfset json.write({ "error" = "Access denied." }, 403)>
</cfif>
<cfif NOT structKeyExists(form, "file") OR NOT len(form.documentId ?: "")>
    <cfset json.write({ "error" = "documentId and a replacement file are required." }, 400)>
</cfif>
<cffile action="upload" filefield="file" destination="#getTempDirectory()#" nameconflict="makeunique" result="uploaded">
<cfset storedPath = uploaded.serverDirectory & "/" & uploaded.serverFile>
<cfset result = new idochive.DocumentService().addVersion(
    form.documentId,
    storedPath,
    uploaded.contentType ?: "application/octet-stream"
)>
<cfif result.ok>
    <cfset json.write({ "id" = result.id, "versionId" = result.versionId, "versionNumber" = result.versionNumber, "state" = "pending_review" }, 201)>
<cfelse>
    <cfset json.write({ "error" = result.error }, 400)>
</cfif>
