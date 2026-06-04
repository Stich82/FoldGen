export namespace backend {
	
	export class Node {
	    name: string;
	    children?: Node[];
	    is_file?: boolean;
	    color?: string;
	
	    static createFrom(source: any = {}) {
	        return new Node(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.children = this.convertValues(source["children"], Node);
	        this.is_file = source["is_file"];
	        this.color = source["color"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class Settings {
	    accent: string;
	    accent_custom?: string[];
	    font_size: number;
	    default_output: string;
	    scan_hidden: boolean;
	    scan_max_depth: number;
	    theme?: string;
	    color_mode?: string;
	    palette?: string[];
	    depth_primary?: string;
	    single_color?: string;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.accent = source["accent"];
	        this.accent_custom = source["accent_custom"];
	        this.font_size = source["font_size"];
	        this.default_output = source["default_output"];
	        this.scan_hidden = source["scan_hidden"];
	        this.scan_max_depth = source["scan_max_depth"];
	        this.theme = source["theme"];
	        this.color_mode = source["color_mode"];
	        this.palette = source["palette"];
	        this.depth_primary = source["depth_primary"];
	        this.single_color = source["single_color"];
	    }
	}
	export class Template {
	    template_name: string;
	    tree: Node[];
	
	    static createFrom(source: any = {}) {
	        return new Template(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.template_name = source["template_name"];
	        this.tree = this.convertValues(source["tree"], Node);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace options {
	
	export class SecondInstanceData {
	    Args: string[];
	    WorkingDirectory: string;
	
	    static createFrom(source: any = {}) {
	        return new SecondInstanceData(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Args = source["Args"];
	        this.WorkingDirectory = source["WorkingDirectory"];
	    }
	}

}

