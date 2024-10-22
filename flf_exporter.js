(function () {
    let exportModelButton;
    let importModelButton;
	let exportAnimationButton;
	
	Plugin.register("flf_exporter", {
		title: "Fossil Legacy Format Exporter",
		author: "Willatendo",
		description: "Exports entity models into flf model format",
		icon: "fa-cube",
		version: "1.0.0",
		variant: "both",
		about: "This plugin exports your Blockbench entity models to be exported in flf model format and animations into fla.",
		tags: ["Minecraft: Java Edition"],
		onload() {
			exportModelButton = new Action("export_flf", {
				name: "Export to FLF",
				description: "Exports entity models to FLF",
				icon: "fa-file-export",
				click() {
					const fileName = Project.name.toLowerCase();
					Blockbench.export({
						type: "FLF Json",
						extensions: ["json"],
						savetype: "text",
						name: `${fileName}.json`,
						content: autoStringify(generateModelFile())
					});
				}
			});
			exportAnimationButton = new Action("export_fla", {
				name: "Export to FLA",
				description: "Exports animations to FLA format",
				icon: "fa-file-export",
				click() {
					const animation = Animation.selected;
					if (animation == null) return;
					Blockbench.export({
						type: "FLA Json",
						extensions: ["json"],
						savetype: "text",
						name: `${animation.name.replaceAll(".", "_").replace("animation_", "").toLowerCase()}.json`,
						content: autoStringify(generateAnimationFile(animation))
					});
				}
			});
			importModelButton = new Action("import_flf", {
				name: "Import FLF",
				description: "Imports FLF format json models",
				icon: "fa-file-import",
				click() {
					Blockbench.import({
						type: "FLF Json",
						extensions: ["json"],
						readtype: "text"
					}, (files) => {
						loadModelFile(JSON.parse(files[0].content))
					});
				}
			});
			
			MenuBar.addAction(exportModelButton, "file.export");
			MenuBar.addAction(exportAnimationButton, "file.export");
			
			MenuBar.addAction(importModelButton, "file.import")
		},
		onunload() {
			exportModelButton.delete();
			exportAnimationButton.delete();
			
			importModelButton.delete();
		}
	});
	
	function generateModelFile() {
		const result = {
			elements: [],
			model_id: Project.name.toLowerCase(),
			texture_height: Project.texture_height,
			texture_width: Project.texture_width
		};
		let allGroups = getAllGroups();
		let looseCubes = [];
		Cube.all.forEach(cube => {
			if (cube.parent == 'root') looseCubes.push(cube)
		})
		if (looseCubes.length) {
			let group = new Group({
				name: 'bb_main'
			});
			group.is_catch_bone = true;
			group.createUniqueName()
			allGroups.push(group)
			group.children.replace(looseCubes)
		}
		allGroups.slice().forEach(group => {
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
	
	function generateAnimationFile(animation) {
		const result = {
			type: "json",
			animations: [],
			id: animation.name.toLowerCase(),
			length: animation.length
		};
        if (animation.loop == "loop") {
            result.looping = true;
        }
        for (const id in animation.animators) {
            const boneAnimator = animation.animators[id];
            if (!(boneAnimator instanceof BoneAnimator)) continue;
            if (boneAnimator.position.length) {
                result.animations.push(generateAnimation(boneAnimator.name, "position", boneAnimator.position));
            }
            if (boneAnimator.rotation.length) {
                result.animations.push(generateAnimation(boneAnimator.name, "rotation", boneAnimator.rotation));
            }
            if (boneAnimator.scale.length) {
                result.animations.push(generateAnimation(boneAnimator.name, "scale", boneAnimator.scale));
            }
        }
		return result;
	}
	
	function generateAnimation(bone, target, keyframes) {
		const animation = {
			bone: bone,
			keyframes: [],
			target: target
		}
		
		for (const keyframe of [...keyframes].sort((a, b) => a.time - b.time)) {
			animation.keyframes.push({
				degree_vec: {
					x: keyframe.get("x"),
					y: keyframe.get("y"),
					z: keyframe.get("z")
				},
				interpolation: keyframe.interpolation,
				timestamp: keyframe.time
			});
		}
		
		return animation;
	}
	
	function loadModelFile(json) {
		Project.name = json.model_id.replace(":", "_");
		Project.texture_width = json.texture_width;
		Project.texture_height = json.texture_height;
		
		var groups = {};
		
		json.elements.forEach(element => loadGroups(element));
		
		Canvas.updateAll();
	}
	
	function loadGroups(element) {
		var groupData = {
			name: element.id
		};
		
		groupData.origin = [ element.poses.x, element.poses.y, element.poses.z ];
		
		var group = new Group(groupData);
		
		group.init();

		element.boxes.forEach(box => loadCube(box, group));
	
		if(element.elements) {
			element.elements.forEach(subElement => loadSubGroups(subElement, group));
		}
	}
	
	function loadSubGroups(element, parent) {
		var groupData = {
			name: element.id
		};
	
		groupData.origin = [ element.poses.x, element.poses.y, element.poses.z ];
	
		var group = new Group(groupData);
		
		group.init();
		
		group.addTo(parent);

		element.boxes.forEach(box => loadCube(box, group));
		
		if(element.elements) {
			element.elements.forEach(subElement => loadSubGroups(subElement, group));
		}
	}
	
	function loadCube(box, parent) {
		let xOrigin = parent.origin[0];
		let zOrigin =  parent.origin[2];
		let yOrigin = box.y_dimension + parent.origin[1];
		var origin = [ xOrigin, zOrigin, yOrigin ];
		
		var cube = new Cube({
			from: origin,
			to: [ box.x_dimension, box.y_dimension, box.z_dimension ],
			uv_offset: [ box.texture_x_offset, box.texture_y_offset ]
		});
		
		cube.init();
		cube.addTo(parent);
	}
})();