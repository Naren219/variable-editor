### app flow
1. Fabric.js editor: test graphics, colors, and text --> produces API url with parameters for variable values and stores full JSON schema in firebase firestore
2. generate page: parse the parameters and design the final image (uses firebase storage for image hosting)
3. API link that uses playwright to screenshot the generate page (in a remote webpage) with all parameter variables applied

### todo
- unwanted color segments shouldn't be accidentally edited
- editor image placement should match the generation

### future reference
#### modifying specific text elements
Add index to each tagged text element (which are transformed into i-text objects after upload)
Identify the element to modify in /generate via the index of that text element

#### modifying specific color elements
TODO
