/* =========================================
   NAVEGACIÓN PRINCIPAL
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // ELEMENTOS
    // =====================================

    const navigationButtons = document.querySelectorAll(
        ".navigation button"
    );

    const sections = document.querySelectorAll(
        ".section"
    );


    // =====================================
    // CAMBIAR DE SECCIÓN
    // =====================================

    function showSection(sectionId) {

        // Ocultar todas las secciones
        sections.forEach(section => {
            section.classList.remove("active");
        });


        // Buscar la sección solicitada
        const targetSection = document.getElementById(
            sectionId
        );


        // Mostrarla
        if (targetSection) {

            targetSection.classList.add("active");
            navigationButtons.forEach(button => {
                if (button.dataset.section === sectionId) button.setAttribute("aria-current", "page");
                else button.removeAttribute("aria-current");
            });

        }

    }


    // =====================================
    // BOTONES DEL MENÚ
    // =====================================

    navigationButtons.forEach(button => {

        button.addEventListener("click", () => {

            const sectionId =
                button.dataset.section;

            if (sectionId) {

                showSection(sectionId);

            }

        });

    });


    // =====================================
    // BOTÓN COMENZAR
    // =====================================

    const startButton =
        document.querySelector(".primary-button");


    if (startButton) {

        startButton.addEventListener("click", () => {

            const sectionId =
                startButton.dataset.section;

            if (sectionId) {

                showSection(sectionId);

            }

        });

    }

});
