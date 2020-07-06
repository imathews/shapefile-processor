# Shapefile processor
Converts shapefiles to CSVs for upload to Redivis

## Usage
First, clone this to your computer and run 
```
npm install
```

Next, run:
```
npm start -- path_to_shp path_to_dbf [path_to_outfile.csv]
```
Where the first two arguments are the paths to the shapefile (.shp) and database file (.dbf), respectively.

The final argument is the path to write the csv output to. If no path is provided, the csv will be written to `converted_shapefile.csv` in the current working directory.