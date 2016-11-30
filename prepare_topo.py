
import csv
import json

# get the TopoJSON data
with open("topo_s.json") as json_file:
	data = json.load(json_file)

# get the geographic informations from csv file
dataLinks = []
with open("table-appartenance-geo-communes-15.csv") as csv_file:
	header = csv_file.readline()
	for row in csv_file.readlines():
		dataLinks.append(row.strip("\n").split(","))

# select geometries
geometries = data["objects"]["geo"]["geometries"]

# sort the geometries by geographic code
geometries = sorted(geometries, key=lambda k: k["properties"]["insee"])

# remove unnecessary geometry properties

attributes2remove = ["wikipedia", "nom", "surf_m2"]

for idx, geometry in enumerate(geometries):
	geometries[idx]["properties"] = {k:v for k, v in geometry["properties"].items()
					                 if k not in attributes2remove}

# update geometries properties with geographic informations

j = 0
arrondissements = {}
# loop through the geometries
for i, geometry in enumerate(geometries):
	# get the INSEE id for this geometry
	inseeId = geometry["properties"]["insee"]
	# if the INSEE id does not correspond to that of the row in the communes csv
	if inseeId != dataLinks[i+j][0]:
		# if communes csv item is Marseille, Lyon or Paris
		if dataLinks[i+j][1] in ["Marseille", "Lyon", "Paris"]:
			# store the informations to use with arrondissements
			arrondissements[dataLinks[i+j][1]] = dataLinks[i+j];
			# increment counter to skip this csv row
			j += 1
		# if the communes csv item is somewhere else process differences
		else:
			# if the geometry is an arrondissement (Marseille or Lyon or Paris)
			if (13200 < int(inseeId) < 13217) or (69380 < int(inseeId) < 69390) or (75100 < int(inseeId) < 75121):
			    # decrement counter to keep current csv row
			    j -= 1
			    # weird missing decrement after Paris arrondissements
			    if int(inseeId) == 75120:
			    	j -= 1
			# if the INSEE id is not present in geometries
			elif int(dataLinks[i+j][0]) in [55138, 71578]:
				# increment counter to skip this csv row
				j += 1
			# if the INSEE id is not present in communes csv
			elif int(inseeId) in [71138, 97501, 97502]:
				# decrement counter to keep current csv row
				j -= 1
			else:
				# there is a bug
				print("Error with", i, geometry["properties"])
				print(dataLinks[i+j])
				break

	if inseeId != dataLinks[i+j][0]:
		if (13200 < int(inseeId) < 13217):
			# update Marseille arrondissements with Marseille properties
			for idx, key in enumerate(["code_arr", "code_cant", "code_dept", "code_reg","code_regn"]):
				geometries[i]["properties"][key] = arrondissements["Marseille"][idx+2]
		elif (69380 < int(inseeId) < 69390):
			# update Lyon arrondissements with Lyon properties
			for idx, key in enumerate(["code_arr", "code_cant", "code_dept", "code_reg","code_regn"]):
				geometries[i]["properties"][key] = arrondissements["Lyon"][idx+2]
		elif (75100 < int(inseeId) < 75121):
			# update Paris arrondissements with Paris properties
			for idx, key in enumerate(["code_arr", "code_cant", "code_dept", "code_reg","code_regn"]):
				geometries[i]["properties"][key] = arrondissements["Paris"][idx+2]
		else:
			# INSEE id is not present in communes csv
			pass
	else:
		# update the geometry properties with csv data
		for idx, key in enumerate(["code_arr", "code_cant", "code_dept", "code_reg","code_regn"]):
			geometries[i]["properties"][key] = dataLinks[i+j][idx+2]

# update the TopoJSON data with the geometries
data["objects"]["geo"]["geometries"] = geometries
# save it to a new file
with open("topo.json", "w") as json_file:
	json.dump(data, json_file, separators=(',', ':'))