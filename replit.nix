{pkgs}: {
  deps = [
    pkgs.chromium
    pkgs.wayland
    pkgs.libdrm
    pkgs.mesa
    pkgs.expat
    pkgs.alsa-lib
    pkgs.cairo
    pkgs.pango
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.cups
    pkgs.atk
    pkgs.dbus
    pkgs.nspr
    pkgs.nss
    pkgs.glib
  ];
}
