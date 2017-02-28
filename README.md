# bloopController
Bloop App just for Raspberry Pi


/drummachine  => SERVER SIDE

/public       => CLIENT SIDE


Raspberry IP : 192.168.41.200


Installation de node JS sur le raspberry Pi : 

- Passage en DHCP auto pour se connecter à internet
    - switcher les fichiers /etc/dhcpcd.conf.static et etc/dhcpcd.conf.dhcp pour le fichier maitre etc/dhcpcd.conf

- en sudo : apt-get install nodejs npm (ne pas confondre avec node sur linux qui est un autre programme qui n’a rien avoir)
- NodeJS est ainsi installé en local et désormais accessible via la commande : node ou nodejs (node —h pour la documentation)

Installation de Git pour la récupération du serveur HTTP en nodeJS

- Installation de Git : sudo apt-get install git 

Installation du module NodeJS pi-gpio / https://github.com/rakeshpai/pi-gpio

« The Raspberry Pi's GPIO pins require you to be root to access them. That's totally unsafe for several reasons. To get around this problem, you should use the excellent gpio-admin. »


- Se situer dans home : cd /home
- git clone git://github.com/quick2wire/quick2wire-gpio-admin.git
- cd quick2wire-gpio-admin

// Problématique de version de l’image raspbian solutionnée par ceci : https://github.com/quick2wire/quick2wire-gpio-admin/issues/10 
Avant de make, ouvrir le fichier dans src GPIO-ADMIN.C et faire la modification suivante : 

Changer 
	int size = snprintf(path, PATH_MAX, "/sys/devices/virtual/gpio/gpio%u/%s", pin, filename);
Par 
	int size = snprintf(path, PATH_MAX, "/sys/class/gpio/gpio%u/%s", pin, filename);


Ensuite

- make
- sudo make install
- sudo adduser $USER gpio (normalement pi est déjà affecté)
