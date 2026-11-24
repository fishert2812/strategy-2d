// Фон проб: тёмная чашка Петри — тёплая середина, края в тень, еле заметная живая рябь.
shader_type canvas_item;
uniform vec2 size = vec2(720.0, 1280.0);
uniform vec3 tint = vec3(0.035, 0.05, 0.085);
uniform vec2 drift = vec2(0.0);

void fragment() {
	vec2 p = UV * size + drift;
	float d = length((UV - 0.5) * size / size.y);
	vec3 col = mix(tint, vec3(0.004, 0.006, 0.012), smoothstep(0.05, 0.7, d));
	float g = sin(p.x * 0.045 + TIME * 0.25) * sin(p.y * 0.04 - TIME * 0.2) + sin((p.x + p.y) * 0.02 + TIME * 0.1);
	col += 0.006 * g;
	COLOR = vec4(col, 1.0);
}
