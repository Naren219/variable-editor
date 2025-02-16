### app flow
1. editor: test graphics, colors, and text --> produces (API) url with placeholders as parameters
2. generate page: parse the parameters and design the final image (uses firebase storage for image hosting)
3. API link that uses puppeteer to screenshot the generate page (in an automated webpage) with all parameter variables

next.js, fabric.js, puppeteer, firebase storage
