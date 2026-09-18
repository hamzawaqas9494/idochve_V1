<cfsetting showdebugoutput="false">
<cfset json = new idochive.JsonUtil()>
<cfset auth = new idochive.AuthService()>
<cfif NOT auth.isAuthenticated()>
    <cfset json.write({ "error" = "Authentication required. RBAC is enforced in the API, not only in the UI." }, 401)>
</cfif>
<cfset docs = new idochive.DocumentService()>
<cfif cgi.request_method EQ "GET">
    <cfset json.write({
        "contractVersion" = "1",
        "documents" = docs.listForUser()
    })>
<cfelseif cgi.request_method EQ "POST">
    <cfif NOT structKeyExists(form, "file")>
        <cfset json.write({ "error" = "An original file is required. Do not skip encrypted storage." }, 400)>
    </cfif>
    <cffile action="uploadAll" filefield="file" destination="#getTempDirectory()#" nameconflict="makeunique" result="uploads">
    <cfset created = []>
    <cfset items = normalizeUploads(uploads)>
    <cfloop array="#items#" index="uploaded">
        <cfset storedPath = uploaded.serverDirectory & "/" & uploaded.serverFile>
        <cfset fileTitle = len(trim(form.title ?: "")) ? trim(form.title) : uploaded.clientFile>
        <cfset mimeType = normalizedMime(uploaded)>
        <cfif arrayLen(items) GT 1>
            <cfset fileTitle = uploaded.clientFile>
        </cfif>
        <cfset result = docs.create(
            {
                title = fileTitle,
                classCode = form.classCode ?: "project_report",
                languageCode = form.languageCode ?: "en",
                mimeType = mimeType
            },
            storedPath
        )>
        <cfif result.ok>
            <cfset arrayAppend(created, { "id" = result.id, "state" = "pending_review" })>
        <cfelse>
            <cfset json.write({ "error" = result.error, "documents" = created }, 400)>
        </cfif>
    </cfloop>
    <cfif arrayLen(created) EQ 0>
        <cfset json.write({ "error" = "No files were stored." }, 400)>
    </cfif>
    <cfset json.write({
        "contractVersion" = "1",
        "id" = created[1].id,
        "state" = "pending_review",
        "documents" = created
    }, 201)>
<cfelse>
    <cfset json.write({ "error" = "Method not allowed." }, 400)>
</cfif>

<cffunction name="normalizeUploads" access="private" returntype="array">
    <cfargument name="uploads" required="true">
    <cfset var items = []>
    <cfif isQuery(arguments.uploads)>
        <cfloop query="arguments.uploads">
            <cfset arrayAppend(items, {
                serverDirectory = arguments.uploads.serverDirectory,
                serverFile = arguments.uploads.serverFile,
                clientFile = arguments.uploads.clientFile,
                contentType = arguments.uploads.contentType,
                contentSubType = arguments.uploads.contentSubType
            })>
        </cfloop>
    <cfelseif isArray(arguments.uploads)>
        <cfset items = arguments.uploads>
    <cfelseif isStruct(arguments.uploads)>
        <cfset arrayAppend(items, arguments.uploads)>
    </cfif>
    <cfreturn items>
</cffunction>

<cffunction name="normalizedMime" access="private" returntype="string">
    <cfargument name="uploaded" type="struct" required="true">
    <cfset var main = trim(toString(arguments.uploaded.contentType ?: ""))>
    <cfset var sub = trim(toString(arguments.uploaded.contentSubType ?: ""))>
    <cfif len(main) AND find("/", main)>
        <cfreturn lCase(main)>
    </cfif>
    <cfif len(main) AND len(sub)>
        <cfreturn lCase(main & "/" & sub)>
    </cfif>
    <cfset var extension = lCase(listLast(arguments.uploaded.clientFile ?: "", "."))>
    <cfswitch expression="#extension#">
        <cfcase value="pdf"><cfreturn "application/pdf"></cfcase>
        <cfcase value="png"><cfreturn "image/png"></cfcase>
        <cfcase value="jpg,jpeg"><cfreturn "image/jpeg"></cfcase>
        <cfcase value="tif,tiff"><cfreturn "image/tiff"></cfcase>
        <cfcase value="webp"><cfreturn "image/webp"></cfcase>
        <cfcase value="gif"><cfreturn "image/gif"></cfcase>
        <cfcase value="bmp"><cfreturn "image/bmp"></cfcase>
    </cfswitch>
    <cfreturn "application/octet-stream">
</cffunction>
