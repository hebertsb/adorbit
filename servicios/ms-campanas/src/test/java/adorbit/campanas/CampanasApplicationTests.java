package adorbit.campanas;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class CampanasApplicationTests {

    @Test
    void contextLoads() {
        System.out.println("=== CONTEXTO CARGADO EXITOSAMENTE ===");
    }
}
