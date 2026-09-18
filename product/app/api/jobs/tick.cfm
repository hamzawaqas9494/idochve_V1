<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfif cgi.request_method NEQ "POST">
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>
<cfif NOT new idochive.JobService().canTick()>
    <cfset json.write({ "error" = "Access denied." }, 403)>
</cfif>
<cfset application.tickRequested = true>
<cfset json.write({
    "ok" = true,
    "processed" = false,
    "workerRunning" = structKeyExists(application, "workerRunning") AND application.workerRunning,
    "woken" = true,
    "message" = "Queued work runs in the background worker, not this request."
})>
