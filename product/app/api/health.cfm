<cfsetting showdebugoutput="false">
<cfcontent type="application/json; charset=utf-8" reset="true">
<cfset payload = {
    "product" = "iDocHive",
    "status" = "degraded",
    "engine" = "ColdFusion / Lucee",
    "database" = {
        "systemOfRecord" = "PostgreSQL",
        "reachable" = false,
        "pgvector" = false
    },
    "publicAiApiRequired" = false,
    "saasSignup" = false,
    "ocr" = new idochive.OcrGateway().status()
}>
<cfset gw = new idochive.ModelGateway().status()>
<cfset payload["embedding"] = {
    "engine" = gw.engine,
    "model" = gw.model,
    "dimension" = gw.dimension,
    "available" = gw.available
}>
<cfset payload["generate"] = {
    "engine" = gw.engine,
    "model" = gw.generateModel,
    "available" = gw.generateAvailable
}>
<cfset structDelete(payload.ocr, "binary")>
<cfset payload.ocr["rasterizer"] = new idochive.PdfRasterizer().status()>
<cfset payload["queue"] = new idochive.JobQueue().status()>
<cftry>
    <cfquery name="ping">
        SELECT 1 AS ok
    </cfquery>
    <cfset payload.database.reachable = true>
    <cfquery name="ext">
        SELECT extname
        FROM pg_extension
        WHERE extname = <cfqueryparam value="vector" cfsqltype="cf_sql_varchar">
    </cfquery>
    <cfset payload.database.pgvector = ext.recordCount GT 0>
    <cfset payload.status = payload.database.pgvector ? "ok" : "degraded">
    <cfcatch>
        <cfset payload.status = "error">
        <cfset payload["error"] = "Database connection failed. Check the idochive datasource.">
    </cfcatch>
</cftry>
<cfoutput>#serializeJSON(payload)#</cfoutput>
