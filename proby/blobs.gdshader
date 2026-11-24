// Живые капли: слой пятен (proby/blobs.gd) режется по порогу. Канал — сторона: R моя, B враг, G ничья.
// Внутри капля темнее к краю и светлее к середине, по краю светлая плёнка, снаружи мягкое свечение.
shader_type canvas_item;
uniform vec4 c0 : source_color;
uniform vec4 c1 : source_color;
uniform vec4 c2 : source_color;
uniform float th = 0.42;

void fragment() {
	vec3 f = texture(TEXTURE, UV).rgb;
	float m = max(f.r, max(f.g, f.b));
	vec3 c = f.r >= m ? c0.rgb : (f.b >= m ? c1.rgb : c2.rgb);
	float body = smoothstep(th - 0.02, th + 0.02, m);
	float depth = smoothstep(th, 0.95, m);
	float rim = body * (1.0 - smoothstep(th + 0.01, th + 0.12, m));
	vec3 inside = mix(c * 0.45, c * 0.95 + 0.06, depth);
	vec3 rgb = inside + rim * (c * 0.6 + 0.3);
	float halo = smoothstep(0.02, th, m);
	COLOR = vec4(mix(c, rgb, body), max(body, halo * halo * 0.35));
}
