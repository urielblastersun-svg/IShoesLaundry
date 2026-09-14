Quiero realizar un proyecto nuevo. A continuacion te explicare el modelo de negocio y mi propuesta de software para el control de ventas y trazabilidad de entregas. 

* Giro de negocio
Se trata de una lavanderia de tenis, donded un cliente llega con una cantidad de tennis, estos se pueden catalogar de distintas formas.

- Tenis blancos
- Tenis de color
- Tenis de niños (a partir de cierto tamaño)
- Piel o gamuza (requieren otro tipo de limpieza)

Adicionalmente, los clientes pueden llevar otro tipo de productos, como gorras o mochilas, siendo estas ultimas las que pueden variar en costo dependiendo del temaño. 

Una vez el cliente entrega estos productos, el encargado toma foto de 4 angulos de cada par de tenis, esto para respaldar el estado en que se encuentra el calzado a la llegada del establecimiento, asi como una foto general de todos los pares junto con la nota entregada, estas fotos se almacenan en la nube de google (una cuenta basica), con esto identifican de donde son cada par adicional a la nota. Se llena una nota con la descripcion del calzado recibido, color, marca y modelo, asi como el precio total, nombre y telefono del cliente asi como el nombre la persona que lo atendio. 

Una vez recibido el pedido, otra persona recoge los tenis al final del dia para el dia siguiente lavarlos y hacer la entrega el dia posterior al lavado. Una vez vuelven al local se hace un detallado y se embolsan junto con su nota. 


* Problematicas 
- El calzado puede llegar a otro establecimiento
- Perdida de la nota

* Propuesta
Cada establecimiento cuenta con una tablet que usan para tomar fotos. La idea es proponer una aplicacion para dichos dispositivos que digitalice la nota a los usuarios, que permita darle un mejor seguimiento al calzado de cada cliente. Esta aplicacion debera contener un login por empleado para asi saber quien realiza cada nota y abra tres roles.

Rol despachador
Debe poder especificar cantidad de tenis, asi como sus caracteristicas y adjuntar las fotos correspondientes pertenecientes a dicho cliente. Despues de especificar el calzado y sus caracteristicas, deberan ponerse los datos del cliente, nombre y telefono. Una vez establecido esto, la nota estara completa. 

Rol transportista
Debera poder ver las notas de cada establecimiento, y podra hacer un checklist de los pedidos que esta recogiendo. 

Rol administrador
Este rol podra ver todas las notas de todos los establecimientos, podra filtrar esta informacion para su consulta mas rapida, asi como ver el estado de cada pedido, ya sea nuevo, recibido o en proceso de transporte, terminados (listos para entrega) y entregados. El administrador es quien marca que recibio los peidos y que estan en proceso de limpieza. Puede consultar todos los pedidos que se han relizados, el monto total de cada nota, hacer descuentos si asi lo desea (modificar el precio directamente o especificar un esquema de descuentos). Debe poder hacer un corte de caja, ver las ganancias por establecimiento, en total asi como gastos realizados. Se pueden consultar anual y mensualmente. 

Entregables
Genera una propuesta para realizar este software, que servicios usaremos, lenguajes de programacion, base de datos, como realizar el host y las demas caraacteristicas que debo contemplar para realizar este proyecto