import os
from PIL import Image

source_path = r"C:\Users\Sanjay\.gemini\antigravity-ide\brain\2602d3b4-fd97-4a68-9d88-98bfc27d2ada\.user_uploaded\media_1792132022759.png"
workspace_dir = r"c:\Users\Sanjay\Documents\test"

src_im = Image.open(source_path).convert("RGBA")
logo_w, logo_h = src_im.size

# 1. Master Icon (1024x1024)
master_size = 1024
master_icon = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 255))
scale_factor = min((master_size * 0.85) / logo_w, (master_size * 0.85) / logo_h)
new_w = int(logo_w * scale_factor)
new_h = int(logo_h * scale_factor)
scaled_logo = src_im.resize((new_w, new_h), Image.Resampling.LANCZOS)
paste_x = (master_size - new_w) // 2
paste_y = (master_size - new_h) // 2
master_icon.paste(scaled_logo, (paste_x, paste_y), scaled_logo)

# 2. Master Foreground for Adaptive Icons and Splash Screen Icon
# Safe zone in Android adaptive icons and Android 12+ Splash Screen is inner 50-54% circle.
# By scaling to 48%, the entire rounded black square and gold emblem fit completely inside the circular mask with zero clipping!
fg_canvas = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
fg_scale = min((master_size * 0.48) / logo_w, (master_size * 0.48) / logo_h)
fg_w = int(logo_w * fg_scale)
fg_h = int(logo_h * fg_scale)
scaled_fg = src_im.resize((fg_w, fg_h), Image.Resampling.LANCZOS)
fg_paste_x = (master_size - fg_w) // 2
fg_paste_y = (master_size - fg_h) // 2
fg_canvas.paste(scaled_fg, (fg_paste_x, fg_paste_y), scaled_fg)

def save_resized(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path)
    print(f"Saved: {path} ({size}x{size})")

android_res = os.path.join(workspace_dir, "android", "app", "src", "main", "res")

# 3. Android Mipmap Icons
density_map = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432)
}

for folder, (ic_size, fg_size) in density_map.items():
    folder_path = os.path.join(android_res, folder)
    save_resized(master_icon, os.path.join(folder_path, "ic_launcher.png"), ic_size)
    save_resized(master_icon, os.path.join(folder_path, "ic_launcher_round.png"), ic_size)
    save_resized(fg_canvas, os.path.join(folder_path, "ic_launcher_foreground.png"), fg_size)

# 4. Save dedicated splash_icon for Android 12+ Splash Screen API
save_resized(fg_canvas, os.path.join(android_res, "drawable", "splash_icon.png"), 512)

# 5. Save drawable app_logo for widgets and in-app usage
save_resized(master_icon, os.path.join(android_res, "drawable", "app_logo.png"), 128)
save_resized(master_icon, os.path.join(android_res, "drawable", "ic_launcher.png"), 192)

# 6. Generate centered splash.png for legacy splash screen drawables
splash_dims = {
    "drawable": (480, 320),
    "drawable-land-hdpi": (800, 480),
    "drawable-land-mdpi": (480, 320),
    "drawable-land-xhdpi": (1280, 720),
    "drawable-land-xxhdpi": (1600, 960),
    "drawable-land-xxxhdpi": (1920, 1280),
    "drawable-port-hdpi": (480, 800),
    "drawable-port-mdpi": (320, 480),
    "drawable-port-xhdpi": (720, 1280),
    "drawable-port-xxhdpi": (960, 1600),
    "drawable-port-xxxhdpi": (1280, 1920)
}

for folder, (sw, sh) in splash_dims.items():
    splash_bg = Image.new("RGBA", (sw, sh), (255, 255, 255, 255))
    target_logo_dim = int(min(sw, sh) * 0.32)
    s_scale = min(target_logo_dim / logo_w, target_logo_dim / logo_h)
    sw_w = int(logo_w * s_scale)
    sw_h = int(logo_h * s_scale)
    s_logo = src_im.resize((sw_w, sw_h), Image.Resampling.LANCZOS)
    sp_x = (sw - sw_w) // 2
    sp_y = (sh - sw_h) // 2
    splash_bg.paste(s_logo, (sp_x, sp_y), s_logo)
    splash_file = os.path.join(android_res, folder, "splash.png")
    splash_bg.convert("RGB").save(splash_file)
    print(f"Generated splash: {splash_file} ({sw}x{sh})")

# 7. iOS Icons
ios_icon_dir = os.path.join(workspace_dir, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset")
save_resized(master_icon, os.path.join(ios_icon_dir, "AppIcon-512@2x.png"), 1024)

# 8. Web Assets
save_resized(master_icon, os.path.join(workspace_dir, "public", "app_logo.png"), 512)
save_resized(master_icon, os.path.join(workspace_dir, "public", "logo192.png"), 192)
save_resized(master_icon, os.path.join(workspace_dir, "public", "favicon.png"), 64)
save_resized(master_icon, os.path.join(workspace_dir, "public", "favicon.ico"), 64)
save_resized(master_icon, os.path.join(workspace_dir, "src", "assets", "app_logo.png"), 512)

print("All app logo & splash screen assets successfully generated with safe margins!")
