<img width="800" alt="editor view" src="https://github.com/user-attachments/assets/18f288ff-2a48-4df0-a571-2caaa4eef11b" />\
quick [demo](https://www.loom.com/share/050e3c8a4ae94727aaf74f4d9f4b10c9?sid=1f0074f6-67f5-4315-9aca-2b097ef144c8)

### purpose
A variable image editor that allows users to import and minimally design a static graphic, then select text, colors, images as variants, allowing for quick customizability.

### app flow
1. Fabric.js editor: test graphics (only SVG), colors, and text --> produces API url with parameters for variable values and stores full JSON schema in firebase firestore
2. generate page: parse the parameters and design the final image (uses firebase storage for image hosting)
3. API link that uses playwright to screenshot the generate page (in a remote webpage) with all parameter variables applied

### APIs
`/api`: retrieve a single image with changes specified in the URL. example:\
`https://variable-editor.vercel.app/api?projectId=myProject&graphicName=graph2.svg&topleft=someTitle&toptag=someTag&topRightImg=profile.svg`\
\
`/api/csv/`: retrieve many images with variables specified in a CSV. example:\
`https://variable-editor.vercel.app/api/csv?projectId=projectId&graphicName=graphicName&topleft=topleft&toptag=toptag&topRightImg=topRightImg`\
pass in CSV data into the body (with variables as headers). returns a list of generated images uploaded in firebase storage.

### challenges
#### precise color editing
potential approaches
* **computer vision segmentation** - convert SVG into raster image, detect color edges and assign different labels, map these segments onto vector image (could be pretty _hard_)
* **computer vision flood fill** - consistent segments regardless of the SVG structure

#### matching image placement between fabric.js canvas view and DOM
potential approaches
* scale factor so that the image is placed relative to board dimensions

### reference
#### modifying specific text elements
add index to each tagged text element (which are transformed into i-text objects after upload). then, identify the element to modify in `/generate` via the index of that text element
