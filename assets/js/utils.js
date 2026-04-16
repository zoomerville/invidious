function createElement(tag, parent, prepend) {
	const child = document.createElement(tag);
	if (prepend === "after"){
		parent.after(child);
	} else if (prepend === "before"){
		parent.before(child);
	} else if (prepend) {
		parent.prepend(child);
	} else {
		parent.appendChild(child);
	}

	child.setAttr = (attr, value) => {
		child[attr] = value;
		return child;
	};

	child.setHTML = v => child.setAttr("innerHTML", v);
	child.setText = v => child.setAttr("textContent", v);
	child.setClass = v => child.setAttr("className", v);
	child.setValue = v => child.setAttr("value", v);
	child.setClick = v => child.setAttr("onclick", v);
	child.setName = v => child.setAttr("name", v);

	return child;
}
