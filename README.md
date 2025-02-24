### app flow
1. editor: test graphics, colors, and text --> produces API url with parameters for variable values and stores full JSON schema in firebase firestore
2. generate page: parse the parameters and design the final image (uses firebase storage for image hosting)
3. API link that uses playwright to screenshot the generate page (in a remote webpage) with all parameter variables

### todo
- unwanted color segments shouldn't be accidentally edited
- editor image placement should match the generation
