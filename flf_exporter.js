(function () {
    let exportButton;
	
	Plugin.register("flf_exporter", {
		title: "Fossil Legacy Format Exporter",
		author: "Willatendo",
		description: "Exports entity models into flf model format",
		icon: "fa-cube",
		version: "1.0.0",
		variant: "both",
		about: "This plugin exports your Blockbench entity models to be exported in flf model format.",
		tags: ["Minecraft: Java Edition"],
		onload() {
			exportButton = new Action("export_flf", {
				name: "Export to FLF",
				description: "Exports entity models to FLF",
				icon: "fa-file-export",
				click() {
					Blockbench.export({
						type: "FLF Json",
						extensions: ["json"],
						savetype: "text",
						content: autoStringify(generateFile())
					});
				}
			});
			
			MenuBar.addAction(exportButton, "file.export");
		},
		onunload() {
			exportButton.delete();
		}
	});
	
	function generateFile() {
		const result = {
			elements: [],
			model_id: Project.name.toLowerCase(),
			texture_height: Project.texture_height,
			texture_width: Project.texture_width
		};
		let all_groups = getAllGroups();
		let loose_cubes = [];
		Cube.all.forEach(cube => {
			if (cube.parent == 'root') loose_cubes.push(cube)
		})
		if (loose_cubes.length) {
			let group = new Group({
				name: 'bb_main'
			});
			group.is_catch_bone = true;
			group.createUniqueName()
			all_groups.push(group)
			group.children.replace(loose_cubes)
		}
		all_groups.slice().forEach(group => {
			if(group.parent == "root") {
				result.elements.push(generateElement(group));
			}
		})
		return result;
	}
	
	function generateElement(group) {
		var origin = group.origin.slice();
		if (group.parent instanceof Group) {
			origin.V3_subtract(group.parent.origin)
		}
		origin[0] *= -1;
		if (Project.modded_entity_flip_y) {
			origin[1] *= -1;
			if (group.parent instanceof Group === false) {
				origin[1] += 24
			}
		}
		const element = {
			boxes: [],
			id: group.name,
			poses: {
				x: origin[0],
				y: origin[1],
				z: origin[2]
			}
		};
		for(let i = 0; i < group.children.length; ++i) {
			var child = group.children[i];
			if(child instanceof Cube) {
				let xOrigin = group.origin[0] - child.to[0];
				let yOrigin = -child.from[1] - child.size(1) + group.origin[1];
				let zOrigin = child.from[2] - group.origin[2];
				element.boxes.push({
					texture_x_offset: child.uv_offset[0],
					texture_y_offset: child.uv_offset[1],
					x_dimension: child.size(0, false),
					x_origin: xOrigin,
					y_dimension: child.size(1, false),
					y_origin: yOrigin,
					z_dimension: child.size(2, false),
					z_origin: zOrigin
				});
				if (child.mirror_uv) {
					element.mirror = true;
				}
			}
			if(child instanceof Group) {
				element.elements = [];
				element.elements.push(generateElement(child));
			}
		}
		return element;
	}
})();