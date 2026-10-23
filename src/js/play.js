var play = {

    preload: function () {
        // Carga de Audio
        game.load.audio('Nivel1', 'assets/sounds/nivel1.mp3');
        game.load.audio('AgarrarPieza', 'assets/sounds/agarrar.mp3');
        game.load.audio('ErrorPieza', 'assets/sounds/error.mp3');
        game.load.audio('OkPieza', 'assets/sounds/pegar.mp3');

        // Carga de Imágenes básicas
        game.load.image('fondo', 'assets/img/fondoColor.png');
        game.load.image('cadenaGlow', 'assets/img/CadenaAdnGlow.png');
        game.load.image('cadena', 'assets/img/cdnAdn.png');
        game.load.image('luces', 'assets/img/fndLz.png');
        game.load.image('particula', 'assets/img/particula.png');

        game.load.text('nivel1', 'niveles/nivel1.txt');

        // Carga dinámica de piezas
        for (let i = 0; i < 2; i++) {
            for (let j = 0; j < 14; j++) {
                game.load.image('pSnCl' + i + j, 'assets/img/level1/' + i + j + '.png');
            }
        }
    },

    create: function () {
        // Inicialización de audio
        this.Nivel1 = game.add.audio('Nivel1');
        this.Nivel1.play();
        this.Nivel1.loopFull();
        
        this.AgarrarPieza = game.add.audio('AgarrarPieza');
        this.ErrorPieza = game.add.audio('ErrorPieza');
        this.OkPieza = game.add.audio('OkPieza');

        // Física y Escenario
        game.physics.startSystem(Phaser.Physics.ARCADE);
        game.add.image(0, 0, 'fondo');
        game.add.image(0, 0, 'luces');
        game.add.image(0, 0, 'particula');

        // Fondos móviles (ADN)
        this.adn = game.add.tileSprite(0, game.world.centerY, 900, 189, 'cadena');
        this.adn.anchor.setTo(0, 0.5);

        this.glow = game.add.tileSprite(0, game.world.centerY, 900, 333, 'cadenaGlow');
        this.glow.anchor.setTo(0, 0.5);

        // Grupos de Física
        this.sinColocarGroup = game.add.physicsGroup();
        this.colocadasGroup = game.add.physicsGroup();

        // Carga de datos del nivel
        this.nivel = game.cache.getText('nivel1').split(',');

        this.sinColocar = [];
        this.colocadas = [];

        // GENERACIÓN DEL INVENTARIO INVERTIDO:
        // Las piezas '1x.png' arriba (y = 20) y las '0x.png' abajo (y = 500)
        for (let i = 0; i < 14; i++) {
            for (let j = 0; j < 2; j++) {
                let indice = j * 14 + i;
                
                let posX = 40 + (i * 60); 
                let posY = (j === 1) ? 20 : 500; 

                let piezaInventario = this.sinColocarGroup.create(posX, posY, 'pSnCl' + j + i);
                piezaInventario.tipo = i;
                piezaInventario.upOrDown = j; 
                
                // Guardamos sus posiciones fijas para el respawn automático
                piezaInventario.xOriginal = posX;
                piezaInventario.yOriginal = posY;

                piezaInventario.inputEnabled = true;
                piezaInventario.input.enableDrag(true);

                piezaInventario.events.onDragStart.add(this.startDrag, this);
                piezaInventario.events.onDragStop.add(this.stopDrag, this);

                this.sinColocar[indice] = piezaInventario;
            }
        }

        // Generar la cadena objetivo móvil en el centro
        let xCadena = 650;
        for (let i = 0; i < this.nivel.length; i += 2) {
            let yCadena = 215;
            let indice = i * 0.5;

            let upOrDown = parseInt(this.nivel[i]);
            if (upOrDown === 0) yCadena = 300;

            let tipo = parseInt(this.nivel[i + 1]);
            
            xCadena += 225;
            let piezaColocada = this.colocadasGroup.create(xCadena, yCadena, 'pSnCl' + upOrDown + tipo);
            piezaColocada.tipo = tipo;
            piezaColocada.upOrDown = upOrDown;
            piezaColocada.inputEnabled = false;
            piezaColocada.encastrada = -1;
            piezaColocada.enable = true;

            this.colocadas[indice] = piezaColocada;
        }

        this.life = 5;
        this.emisor();
    },

    emisor: function(){
        let emitter = game.add.emitter(game.world.centerX, 200, 200);
        emitter.width = 800;
        emitter.makeParticles('particula');
        emitter.minParticleSpeed.set(0, 300);
        emitter.maxParticleSpeed.set(0, 400);
        emitter.setRotation(0, 0);
        emitter.setAlpha(0.3, 0.8);
        emitter.setScale(0.5, 0.5, 1, 1);
        emitter.gravity = -200;
        emitter.start(false, 5000, 100);
    },

    startDrag: function (pieza) {
        this.AgarrarPieza.play();
        pieza.bringToTop(); // Evita que se mueva por detrás de los fondos
    },

    stopDrag: function (pieza) {
        // CORRECCIÓN: Usamos overlap en lugar de collide para evitar saltos físicos raros de Phaser
        let colisiono = game.physics.arcade.overlap(pieza, this.colocadasGroup, this.collisionHandler, null, this);

        // Si se suelta en cualquier lado sin encastrar, regresa de forma segura a su sitio original
        if (!colisiono) {
            pieza.x = pieza.xOriginal;
            pieza.y = pieza.yOriginal;
        }
    },

    update: function () {
        this.moveAdn();
    },

    collisionHandler: function (pSnCl, pCl) {
        console.log("collisionHandler");

        // LÓGICA DE COMPLEMENTARIEDAD BIO-ADN CORRECTA:
        if (pSnCl.tipo === pCl.tipo && pSnCl.upOrDown !== pCl.upOrDown && pCl.encastrada < 0) {
            
            // Deshabilitamos el cuerpo físico para que deje de interactuar con el motor arcade
            pSnCl.body.enable = false;
            pSnCl.inputEnabled = false;

            pSnCl.x = pCl.x;
            // Ajuste simétrico de acople visual según la posición en la hélice
            pSnCl.y = (pCl.upOrDown === 1) ? pCl.y + 85 : pCl.y - 85;
            pSnCl.bringToTop();

            pCl.encastrada = this.sinColocar.indexOf(pSnCl);

            // RESPRAWN EN EL INVENTARIO: Se clona únicamente tras una colocación exitosa
            let nuevaPieza = this.sinColocarGroup.create(pSnCl.xOriginal, pSnCl.yOriginal, pSnCl.key);
            nuevaPieza.tipo = pSnCl.tipo;
            nuevaPieza.upOrDown = pSnCl.upOrDown;
            nuevaPieza.xOriginal = pSnCl.xOriginal;
            nuevaPieza.yOriginal = pSnCl.yOriginal;

            nuevaPieza.inputEnabled = true;
            nuevaPieza.input.enableDrag(true);
            nuevaPieza.events.onDragStart.add(this.startDrag, this); 
            nuevaPieza.events.onDragStop.add(this.stopDrag, this);

            this.sinColocar.push(nuevaPieza);

            game.camera.flash(0xffffff, 400);
            this.OkPieza.play();
            
        } else {
            // Si choca contra la hélice pero no coincide el tipo, cuenta como fallo y regresa al inventario
            game.camera.flash(0xff0000, 400);
            game.camera.shake(0.02, 200);

            this.life--;
            this.ErrorPieza.play();

            // Devuelve la pieza intacta a su ranura en lugar de destruirla
            pSnCl.x = pSnCl.xOriginal;
            pSnCl.y = pSnCl.yOriginal;

            if (this.life <= 0) {
                this.final(false);
            }
        }
    },

    moveAdn: function () {
        const vel = 0.1;
        const desplazamiento = vel * game.time.elapsed;

        this.adn.tilePosition.x -= desplazamiento;
        this.glow.tilePosition.x -= desplazamiento;

        for (let i = 0; i < this.colocadas.length; i++) {
            let colocada = this.colocadas[i];
            
            if (colocada.enable) {
                colocada.x -= desplazamiento;
                
                if (colocada.encastrada >= 0 && this.sinColocar[colocada.encastrada] && this.sinColocar[colocada.encastrada].alive) {
                    this.sinColocar[colocada.encastrada].x -= desplazamiento;
                }

                if (colocada.x < -50) {
                    if (colocada.encastrada < 0) {
                        this.life--;
                        game.camera.flash(0xff0000, 400);
                        game.camera.shake(0.02, 200);
                    }
                    colocada.enable = false;
                    
                    if (this.life <= 0) {
                        this.final(false);
                        return;
                    }
                }
            }
        }

        // Condición de victoria: todas las piezas pasaron de largo con vidas restantes
        if (this.colocadas.length > 0 && !this.colocadas[this.colocadas.length - 1].enable) {
            if (this.life > 0) {
                this.final(true);
            }
        }
    },

    final: function(gano) {
        this.Nivel1.stop();
        if(gano) {
            game.state.start('animales', true, false, 8, true);
        } else {
            game.state.start('animales', true, false, 1, false);
            // game.state.start('play'); 
        }
    }
};
