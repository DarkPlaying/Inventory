import os
from PIL import Image, ImageOps

source_path = r"C:\Users\Sanjay\.gemini\antigravity-ide\brain\2602d3b4-fd97-4a68-9d88-98bfc27d2ada\.user_uploaded\media_1792132022759.png"
workspace_dir = r"c:\Users\Sanjay\Documents\test"

src_im = Image.open(source_path).convert("RGBA")

# 1. Create a master 1024x1024 icon on solid black background
master_size = 1024
master_icon = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 255))

# Scale logo to fit nicely with ~10% margin on master icon
logo_w, logo_h = src_im.size
scale_factor = min((master_size * 0.82) / logo_w, (master_size * 0.82) / logo_h)
new_w = int(logo_w * scale_factor)
new_h = int(logo_h * scale_factor)
scaled_logo = src_im.resize((new_w, new_h), Image.Resampling.LANCZOS)

paste_x = (master_size - new_w) // 2
paste_y = (master_size - new_h) // 2
master_icon.paste(scaled_logo, (paste_x, paste_y), scaled_logo)

# 2. Create master foreground for adaptive icons with safe margin (~62% of canvas)
fg_canvas = Image.new("RGBA", (master_size, master_size), (0, 0, 0, 0))
fg_scale = min((master_size * 0.65) / logo_w, (master_size * 0.65) / logo_h)
fg_w = int(logo_w * fg_scale)
fg_h = int(logo_h * fg_scale)
scaled_fg = src_im.resize((fg_w, fg_h), Image.Resampling.LANCZOS)
fg_paste_x = (master_size - fg_w) // 2
fg_paste_y = (master_size - fg_h) // 2
fg_canvas.paste(scaled_fg, (fg_paste_x, fg_paste_y), scaled_fg)

# Helper function to save resized
def save_resized(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    resized = img.resize((size, size), Image.Resampling.LANCZOS)
    resized.save(path)
    print(f"Saved: {path} ({size}x{size})")

# 3. Android Mipmap Icons
android_res = os.path.join(workspace_dir, "android", "app", "src", "main", "res")

density_map = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432)
}

for folder, (ic_size, fg_size) in density_map.items():
    folder_path = os.path.join(android_res, folder)
    # Standard icon
    save_resized(master_icon, os.path.join(folder_path, "ic_launcher.png"), ic_size)
    save_resized(master_icon, os.path.join(folder_path, "ic_launcher_round.png"), ic_size)
    # Foreground adaptive icon
    save_resized(fg_canvas, os.path.join(folder_path, "ic_launcher_foreground.png"), fg_size)

# Save drawable app_logo for widgets and in-app usage
save_resized(master_icon, os.path.join(android_res, "drawable", "app_logo.png"), 128)
save_resized(master_icon, os.path.join(android_res, "drawable", "ic_launcher.png"), 192)

# 4. iOS Icons
ios_icon_dir = os.path.join(workspace_dir, "ios", "App", "App", "Assets.xcassets", "AppIcon.appiconset")
save_resized(master_icon, os.path.join(ios_icon_dir, "AppIcon-512@2x.png"), 1024)

# 5. Web Assets
save_resized(master_icon, os.path.join(workspace_dir, "public", "app_logo.png"), 512)
save_resized(master_icon, os.path.join(workspace_dir, "public", "logo192.png"), 192)
save_resized(master_icon, os.path.join(workspace_dir, "public", "favicon.png"), 64)
save_resized(master_icon, os.path.join(workspace_dir, "public", "favicon.ico"), 64)
save_resized(master_icon, os.path.join(workspace_dir, "src", "assets", "app_logo.png"), 512)

print("All app logo assets successfully generated!")
