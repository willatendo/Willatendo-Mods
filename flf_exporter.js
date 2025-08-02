(function () {
    let exportJsonModelButton;
	let exportJsonAnimationButton;
    let exportJavaModelButton;
	let exportJavaAnimationButton;
	
	Plugin.register("flf_exporter", {
		title: "Fossil Legacy Format Exporter",
		author: "Willatendo",
		description: "Exports entity models into flf model format",
		icon: "fa-cube",
		version: "2.0.1",
		variant: "both",
		about: "This plugin exports your Blockbench entity models to be exported in flf model format and animations into fla.",
		tags: ["Minecraft: Java Edition"],
		onload() {
			exportJsonModelButton = new Action("export_json_flf", {
				name: "Export to Json FLF",
				description: "Exports entity models to a json FLF model",
				icon: "fa-file-export",
				click() {
					const fileName = Project.name.toLowerCase();
					Blockbench.export({
						type: "FLF Json",
						extensions: ["json"],
						savetype: "text",
						name: `${fileName}.json`,
						content: autoStringify(generateJsonModelFile())
					});
				}
			});
			exportJsonAnimationButton = new Action("export_json_fla", {
				name: "Export to Json FLA",
				description: "Exports animations to a json FLA model",
				icon: "fa-file-export",
				click() {
					const animation = Animation.selected;
					if (animation == null) return;
					Blockbench.export({
						type: "FLA Json",
						extensions: ["json"],
						savetype: "text",
						name: `${animation.name.replaceAll(".", "_").replace("animation_", "").toLowerCase()}.json`,
						content: autoStringify(generateJsonAnimationFile(animation))
					});
				}
			});
			exportJavaModelButton = new Action("export_java_flf", {
				name: "Export to Java FLF",
				description: "Exports entity models to a java FLF model for datagen purposes",
				icon: "fa-file-export",
				click() {
					Blockbench.export({
						type: "FLF Datagen",
						extensions: ["txt"],
						savetype: "text",
						content: generateJavaModelFile()
					});
				}
			});
			exportJavaAnimationButton = new Action("export_java_fla", {
				name: "Export to Java FLA",
				description: "Exports animations to a java FLA model for datagen purposes",
				icon: "fa-file-export",
				condition: () => Format.animation_mode,
				click() {
					Blockbench.export({
						type: "FLA Datagen",
						extensions: ["txt"],
						savetype: "text",
						content: generateJavaAnimationFile()
					});
				}
			});
			
			MenuBar.addAction(exportJsonModelButton, "file.export");
			MenuBar.addAction(exportJsonAnimationButton, "file.export");
			MenuBar.addAction(exportJavaModelButton, "file.export");
			MenuBar.addAction(exportJavaAnimationButton, "file.export");			
		},
		onunload() {
			exportJsonModelButton.delete();
			exportJsonAnimationButton.delete();
			exportJavaModelButton.delete();
			exportJavaAnimationButton.delete();
		}
	});
	
	function generateJsonModelFile() {
		const result = {
			elements: [],
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
				if (element.elements == null) {
					element.elements = [];
				}
				element.elements.push(generateElement(child));
			}
		}
		return element;
	}
	
	function generateJavaModelFile() {
		let output = `\nprivate static JsonModel.Builder createBodyLayer() {\nJsonModel.Builder builder = JsonModel.builder(${Project.texture_width}, ${Project.texture_height});`;
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
				output += generateJavaElement(group, 0);
			}
		})
		output += `\nreturn builder;\n}`
		return output.replaceAll("66666666666", "67").replaceAll("33333333333", "34");
	}
	
	function generateJavaElement(group, size) {
		let output = "";
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
		if(size === 0) {
			output += `\nbuilder.addOrReplaceChild("${group.name}", elementBuilder -> elementBuilder`;
		} else {
			output += `\n.addOrReplaceChild("${group.name}", subElement${size}Builder -> subElement${size}Builder`;
			
		}
		for(let i = 0; i < group.children.length; ++i) {
			var child = group.children[i];
			if(child instanceof Cube) {
				let xOrigin = group.origin[0] - child.to[0];
				let yOrigin = -child.from[1] - child.size(1) + group.origin[1];
				let zOrigin = child.from[2] - group.origin[2];
				if (child.mirror_uv) {
					output += `\n.addBox(${child.uv_offset[0]}, ${child.uv_offset[1]}, ${xOrigin}F, ${yOrigin}F, ${zOrigin}F, ${child.size(0, false)}F, ${child.size(1, false)}F, ${child.size(2, false)}F, true)`;
				} else {
					output += `\n.addBox(${child.uv_offset[0]}, ${child.uv_offset[1]}, ${xOrigin}F, ${yOrigin}F, ${zOrigin}F, ${child.size(0, false)}F, ${child.size(1, false)}F, ${child.size(2, false)}F)`;
				}
			}
			if(child instanceof Group) {
				let childOutput = "";
				childOutput += generateJavaElement(child, size + 1);
				output += childOutput;
				output += `\n)`;
			}
		}
		output += `.build(),\nJsonPose.offset(${origin[0]}F, ${origin[1]}F, ${origin[2]}F)`;
		if(size === 0) {
			output += `\n);`;
		}
		return output;
	}
	
	function generateJsonAnimationFile(animation) {
		const result = {
			animation_channels: [],
			length: animation.length
		};
        if (animation.loop == "loop") {
            result.looping = true;
        }
        for (const id in animation.animators) {
            const boneAnimator = animation.animators[id];
            if (!(boneAnimator instanceof BoneAnimator)) continue;
            if (boneAnimator.position.length) {
                result.animation_channels.push(generateAnimation(boneAnimator.name, "position", boneAnimator.position));
            }
            if (boneAnimator.rotation.length) {
                result.animation_channels.push(generateAnimation(boneAnimator.name, "rotation", boneAnimator.rotation));
            }
            if (boneAnimator.scale.length) {
                result.animation_channels.push(generateAnimation(boneAnimator.name, "scale", boneAnimator.scale));
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
				vector: {
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
	
	
	function generateJavaAnimationFile() {
		let output = "";
		
		for (const animation of Animation.all) {
			output += `\npublic static final JsonAnimation ${animation.name.replaceAll(".", "_").replace("animation_", "").toUpperCase()} = JsonAnimation.builder(${animation.length}F)`;
			
			if (animation.loop === "loop") {
				output += ".looping()";
			}

            for (const id in animation.animators) {
				const boneAnimator = animation.animators[id];
                if (!(boneAnimator instanceof BoneAnimator)) continue;
				
				let posKeyArray = [];
                let rotKeyArray = [];
                let scaleKeyArray = [];
				
				if (boneAnimator.position.length) {
					output += `\n.addAnimation("${boneAnimator.name}", "position"`;
					
					for (const keyFrame of boneAnimator.position) {
						posKeyArray.push(keyFrame);
					}
					
					posKeyArray.sort((a, b) => a.time - b.time);
					
					for (const keyFrame of posKeyArray) {
						const {x = 0.0, y = 0.0, z = 0.0} = keyFrame.data_points[0];
						output += `,\n\t\tJsonKeyframe.create(${keyFrame.time}F, ${round2(x)}F, ${round2(y)}F, ${round2(z)}F, "${keyFrame.interpolation}")`;
					}
					
					output += ")";
				}
				
                if (boneAnimator.rotation.length) {
					output += `\n.addAnimation("${boneAnimator.name}", "rotation"`;
					
					for (const keyFrame of boneAnimator.rotation) {
						rotKeyArray.push(keyFrame);
					}
					
					rotKeyArray.sort((a, b) => a.time - b.time);
					
					for (const keyFrame of rotKeyArray) {
						const {x = 0.0, y = 0.0, z = 0.0} = keyFrame.data_points[0];
						output += `,\n\t\tJsonKeyframe.create(${keyFrame.time}F, ${round2(x)}F, ${round2(y)}F, ${round2(z)}F, "${keyFrame.interpolation}")`;
					}
					
					output += ")";
				}
				
				if (boneAnimator.scale.length) {
					output += `\n.addAnimation("${boneAnimator.name}", "scale"`;
					
					for (const keyFrame of boneAnimator.scale) {
						scaleKeyArray.push(keyFrame);
					}
					
					scaleKeyArray.sort((a, b) => a.time - b.time);
					
					for (const keyFrame of scaleKeyArray) {
						const {x = 0.0, y = 0.0, z = 0.0} = keyFrame.data_points[0];
						output += `,\n\t\tJsonKeyframe.create(${keyFrame.time}F, ${round2(x)}F, ${round2(y)}F, ${round2(z)}F, "${keyFrame.interpolation}")`;
					}
					
					output += ")";
				}
			}
            output += ".build();";
		}
		
		return output.replaceAll("66666666666", "67").replaceAll("33333333333", "34");
	}
	
    function round2(n) {
        return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
    }
})();