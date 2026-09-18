<cfset uiIndex = expandPath("/www/index.html")>
<cfif fileExists(uiIndex)>
    <cfheader name="Content-Type" value="text/html; charset=utf-8">
    <cfcontent type="text/html; charset=utf-8" reset="true">
    <cfoutput>#fileRead(uiIndex)#</cfoutput>
<cfelse>
    <cfcontent type="application/json; charset=utf-8" reset="true">
    <cfset payload = {
        "product" = "iDocHive",
        "layer" = "ColdFusion application and policy",
        "message" = "CommandBox is serving the API. Build the React UI with npm run build in product/ui."
    }>
    <cfoutput>#serializeJSON(payload)#</cfoutput>
</cfif>
